import { randomUUID } from 'node:crypto';

import * as QRCode from 'qrcode';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { StorageService } from '../../core/storage/storage.service';
import { EmailService } from '../email/email.service';
import { CerfaService } from './cerfa.service';
import {
  computePickupSlots,
  DonationLineSnapshot,
  intersectWindows,
  isValidPickupSlot,
  MAX_DONATION_AGE_DAYS,
  MAX_PROPOSALS_PER_DONATION,
  MISSED_PICKUP_GRACE_HOURS,
  parsePickupWindows,
} from './donation.types';
import { DonationMatchingService } from './donation-matching.service';

export interface CreateDonationInput {
  action_id?: string;
  lines: { product_id: string; quantity: number }[];
  // Mode avancé : proposer d'abord à cette asso (si elle est éligible) —
  // le reste de la cascade reste piloté par l'orchestrateur
  preferred_association_id?: string;
}

export interface RespondInput {
  decision: 'ACCEPT' | 'REFUSE';
  // Pour ACCEPT : quantités prises ligne par ligne (0..quantité proposée).
  // Absent ou égal au proposé sur toutes les lignes = acceptation totale.
  lines?: { product_id: string; quantity: number }[];
  slot_start?: string;
  slot_end?: string;
  refusal_reason?: string;
}

// L'acceptation et le choix de créneau sont UN SEUL POST : pas d'état
// intermédiaire « accepté sans créneau » (cas limite n°6).

// Message du 409 : la page re-fetche alors le GET pour afficher l'état réel
// (lot attribué, reliquat re-proposé, don annulé…) — jamais d'erreur brute.
export const PROPOSAL_GONE = "Cette proposition n'est plus disponible";

@Injectable()
export class DonationOrchestratorService {
  private readonly logger = new Logger(DonationOrchestratorService.name);

  constructor(
    private readonly matching: DonationMatchingService,
    private readonly email: EmailService,
    private readonly cerfa: CerfaService,
    private readonly storage: StorageService
  ) {}

  // ── Création (le titulaire valide le don UNE fois, ensuite le système pilote)

  async createDonation(
    pharmacyId: string,
    userId: string,
    input: CreateDonationInput
  ) {
    if (!input.lines?.length) {
      throw new BadRequestException('Le lot doit contenir au moins un produit');
    }
    const products = await prisma.product.findMany({
      where: {
        product_id: { in: input.lines.map((l) => l.product_id) },
        pharmacy_id: pharmacyId,
      },
    });
    const byId = new Map(products.map((p) => [p.product_id, p]));
    for (const line of input.lines) {
      const product = byId.get(line.product_id);
      if (!product) throw new NotFoundException('Produit introuvable');
      if (line.quantity <= 0 || line.quantity > product.stock_quantity) {
        throw new BadRequestException(
          `Quantité invalide pour ${product.name} (stock : ${product.stock_quantity})`
        );
      }
      // Art. 238 bis CGI : le don est valorisé au coût de revient HT (prix
      // d'achat grossiste) — le Cerfa engage fiscalement le pharmacien, on
      // refuse de valoriser sans cette donnée
      if (product.cost_price == null || product.cost_price <= 0) {
        throw new BadRequestException(
          `Prix d'achat manquant pour ${product.name} — renseignez le coût de revient (import CSV ou fiche produit) avant de donner`
        );
      }
    }

    const donation = await prisma.donation.create({
      data: {
        pharmacy_id: pharmacyId,
        action_id: input.action_id ?? null,
        status: 'EN_COURS',
        lines: {
          create: input.lines.map((l) => ({
            product_id: l.product_id,
            quantity_total: l.quantity,
            // Coût de revient HT, PAS le prix de vente catalogue
            unit_value: byId.get(l.product_id)!.cost_price!,
          })),
        },
        events: {
          create: {
            type: 'DON_CREE',
            actor: `TITULAIRE:${userId}`,
            payload: { lines: input.lines },
          },
        },
      },
      include: { lines: true },
    });

    this.logger.log(`[${pharmacyId}] Donation ${donation.donation_id} créée`);
    await this.proposeNext(
      donation.donation_id,
      input.preferred_association_id
    );
    return prisma.donation.findUnique({
      where: { donation_id: donation.donation_id },
      include: { lines: true, proposals: true },
    });
  }

  // ── Cascade : propose le reliquat à la prochaine asso du classement ────────

  async proposeNext(
    donationId: string,
    preferredAssociationId?: string
  ): Promise<void> {
    const donation = await prisma.donation.findUnique({
      where: { donation_id: donationId },
      include: {
        lines: { include: { product: true } },
        pharmacy: true,
        proposals: { where: { status: 'ENVOYEE' } },
      },
    });
    if (!donation || donation.status !== 'EN_COURS') return;
    // Une seule proposition active à la fois par périmètre de lot
    if (donation.proposals.length > 0) return;

    const remaining = donation.lines
      .map((l) => ({
        product_id: l.product_id,
        name: l.product.name,
        category: l.product.category,
        quantity: l.quantity_total - l.quantity_allocated,
        unit_value: l.unit_value,
      }))
      .filter((l) => l.quantity > 0);
    // Tout est alloué : on attend les retraits (complétion au confirmPickup)
    if (remaining.length === 0) return;

    const ageDays =
      (Date.now() - donation.created_at.getTime()) / (24 * 3600 * 1000);
    if (
      donation.attempt_count >= MAX_PROPOSALS_PER_DONATION ||
      ageDays > MAX_DONATION_AGE_DAYS
    ) {
      await this.failDonation(donation, remaining, 'EPUISEMENT');
      return;
    }

    const ranked = await this.matching.rankEligible(
      donation.pharmacy,
      remaining,
      donationId
    );
    if (ranked.length === 0) {
      await this.failDonation(donation, remaining, 'AUCUNE_ASSO_ELIGIBLE');
      return;
    }

    const next =
      ranked.find((r) => r.association_id === preferredAssociationId) ??
      ranked[0];
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + next.response_sla_hours * 3600 * 1000
    );
    const snapshot: DonationLineSnapshot[] = remaining.map((l) => ({
      product_id: l.product_id,
      name: l.name,
      quantity: l.quantity,
      unit_value: l.unit_value,
    }));

    const proposal = await prisma.$transaction(async (tx) => {
      // Optimistic locking : si le don a bougé (annulation concurrente), on
      // abandonne — le prochain déclencheur reprendra
      const bumped = await tx.donation.updateMany({
        where: {
          donation_id: donationId,
          status: 'EN_COURS',
          version: donation.version,
        },
        data: { version: { increment: 1 }, attempt_count: { increment: 1 } },
      });
      if (bumped.count === 0) return null;

      const created = await tx.donationProposal.create({
        data: {
          donation_id: donationId,
          association_id: next.association_id,
          proposed_lines: snapshot as object[],
          sent_at: now,
          expires_at: expiresAt,
        },
      });
      await tx.association.update({
        where: { association_id: next.association_id },
        data: { last_proposal_at: now },
      });
      await tx.donationEvent.create({
        data: {
          donation_id: donationId,
          type: 'PROPOSITION_ENVOYEE',
          actor: 'SYSTEM',
          payload: {
            association_id: next.association_id,
            association_name: next.name,
            lines: snapshot as object[],
            expires_at: expiresAt.toISOString(),
          },
        },
      });
      return created;
    });
    if (!proposal) return;

    this.logger.log(
      `[don ${donationId}] Proposition ${proposal.proposal_id} → ${next.name}`
    );
    if (next.contact_email) {
      await this.sendOnce(
        { proposal_id: proposal.proposal_id, email_type: 'PROPOSITION' },
        () =>
          this.email.sendDonationProposalEmail(
            next.contact_email!,
            next.name,
            donation.pharmacy.name,
            `${config.frontUrl}/don/${proposal.token}`,
            expiresAt
          )
      );
    }
  }

  // ── Réponse asso via la page tokenisée ─────────────────────────────────────

  async getProposalView(token: string) {
    const proposal = await prisma.donationProposal.findUnique({
      where: { token },
      include: {
        donation: { include: { pharmacy: true } },
        association: true,
        allocation: true,
      },
    });
    if (!proposal) throw new NotFoundException('Lien invalide');
    return this.buildView(proposal);
  }

  async respondToProposal(token: string, input: RespondInput) {
    const proposal = await prisma.donationProposal.findUnique({
      where: { token },
      include: {
        donation: { include: { pharmacy: true, lines: true } },
        association: true,
        allocation: true,
      },
    });
    if (!proposal) throw new NotFoundException('Lien invalide');

    // Token rejoué, proposition remplacée, don annulé... → 409 avec l'état
    // réel pour que la page bascule en page d'état (cas limites n°1, 2, 4)
    if (
      proposal.status !== 'ENVOYEE' ||
      proposal.donation.status !== 'EN_COURS'
    ) {
      throw new ConflictException(PROPOSAL_GONE);
    }
    if (proposal.expires_at < new Date()) {
      await this.expireProposal(proposal.proposal_id, proposal.donation_id);
      throw new ConflictException(PROPOSAL_GONE);
    }

    if (input.decision === 'REFUSE') {
      return this.refuseProposal(proposal, input.refusal_reason);
    }
    return this.acceptProposal(proposal, input);
  }

  private async refuseProposal(
    proposal: {
      proposal_id: string;
      donation_id: string;
      association_id: string;
      token: string;
    },
    reason?: string
  ) {
    const claimed = await prisma.donationProposal.updateMany({
      where: { proposal_id: proposal.proposal_id, status: 'ENVOYEE' },
      data: {
        status: 'REFUSEE',
        responded_at: new Date(),
        refusal_reason: reason ?? null,
      },
    });
    if (claimed.count === 0) {
      throw new ConflictException(PROPOSAL_GONE);
    }
    await prisma.donationEvent.create({
      data: {
        donation_id: proposal.donation_id,
        type: 'PROPOSITION_REFUSEE',
        actor: `ASSOCIATION:${proposal.association_id}`,
        payload: reason ? { reason } : undefined,
      },
    });
    // Refus → cascade immédiate vers l'asso suivante
    await this.proposeNext(proposal.donation_id);
    return this.getProposalView(proposal.token);
  }

  private async acceptProposal(
    proposal: {
      proposal_id: string;
      donation_id: string;
      association_id: string;
      token: string;
      proposed_lines: unknown;
      donation: {
        version: number;
        pharmacy: {
          name: string;
          address: string | null;
          donation_pickup_windows: unknown;
        };
        lines: {
          line_id: string;
          product_id: string;
          quantity_total: number;
          quantity_allocated: number;
        }[];
      };
      association: {
        name: string;
        contact_email: string | null;
        pickup_sla_days: number;
        pickup_windows: unknown;
      };
    },
    input: RespondInput
  ) {
    const proposed =
      proposal.proposed_lines as unknown as DonationLineSnapshot[];
    const wanted = new Map(
      (input.lines ?? proposed).map((l) => [l.product_id, l.quantity])
    );

    const accepted: DonationLineSnapshot[] = [];
    let isPartial = false;
    for (const line of proposed) {
      const qty = wanted.get(line.product_id) ?? 0;
      if (qty < 0 || qty > line.quantity) {
        throw new BadRequestException(
          `Quantité invalide pour ${line.name} (0 à ${line.quantity})`
        );
      }
      if (qty < line.quantity) isPartial = true;
      if (qty > 0) accepted.push({ ...line, quantity: qty });
    }
    if (accepted.length === 0) {
      throw new BadRequestException(
        'Aucune quantité acceptée — utilisez le refus si vous ne prenez rien'
      );
    }

    if (!input.slot_start || !input.slot_end) {
      throw new BadRequestException('Choisissez un créneau de récupération');
    }
    const slotStart = new Date(input.slot_start);
    const slotEnd = new Date(input.slot_end);
    const windows = intersectWindows(
      parsePickupWindows(proposal.donation.pharmacy.donation_pickup_windows),
      proposal.association.pickup_windows
    );
    if (
      isNaN(slotStart.getTime()) ||
      isNaN(slotEnd.getTime()) ||
      !isValidPickupSlot(
        windows,
        proposal.association.pickup_sla_days,
        slotStart,
        slotEnd
      )
    ) {
      throw new BadRequestException(
        "Ce créneau n'est plus disponible — rechargez la page"
      );
    }

    const newStatus = isPartial ? 'ACCEPTEE_PARTIELLEMENT' : 'ACCEPTEE';
    const linesById = new Map(
      proposal.donation.lines.map((l) => [l.product_id, l])
    );

    await prisma
      .$transaction(async (tx) => {
        // Double soumission / token rejoué : un seul POST passe (cas n°1)
        const claimed = await tx.donationProposal.updateMany({
          where: { proposal_id: proposal.proposal_id, status: 'ENVOYEE' },
          data: { status: newStatus, responded_at: new Date() },
        });
        if (claimed.count === 0) throw new ConflictException();

        // Annulation titulaire concurrente (cas n°4)
        const bumped = await tx.donation.updateMany({
          where: {
            donation_id: proposal.donation_id,
            status: 'EN_COURS',
            version: proposal.donation.version,
          },
          data: { version: { increment: 1 } },
        });
        if (bumped.count === 0) throw new ConflictException();

        // Incrément des allocations dans la même transaction, borné par le
        // total (cas n°3) — la contrainte CHECK en base couvre le résiduel
        for (const line of accepted) {
          const known = linesById.get(line.product_id);
          if (!known) throw new ConflictException();
          const updated = await tx.donationLine.updateMany({
            where: {
              line_id: known.line_id,
              quantity_allocated: { lte: known.quantity_total - line.quantity },
            },
            data: { quantity_allocated: { increment: line.quantity } },
          });
          if (updated.count === 0) throw new ConflictException();
        }

        await tx.donationAllocation.create({
          data: {
            donation_id: proposal.donation_id,
            association_id: proposal.association_id,
            proposal_id: proposal.proposal_id,
            lines: accepted as unknown as object[],
            pickup_slot_start: slotStart,
            pickup_slot_end: slotEnd,
          },
        });
        await tx.donationEvent.create({
          data: {
            donation_id: proposal.donation_id,
            type: isPartial
              ? 'PROPOSITION_ACCEPTEE_PARTIELLEMENT'
              : 'PROPOSITION_ACCEPTEE',
            actor: `ASSOCIATION:${proposal.association_id}`,
            payload: {
              association_name: proposal.association.name,
              lines: accepted as unknown as object[],
              slot_start: slotStart.toISOString(),
              slot_end: slotEnd.toISOString(),
            },
          },
        });
      })
      .catch((err) => {
        if (err instanceof ConflictException) {
          throw new ConflictException(PROPOSAL_GONE);
        }
        throw err;
      });

    if (proposal.association.contact_email) {
      await this.sendOnce(
        {
          proposal_id: proposal.proposal_id,
          email_type: 'CONFIRMATION_ACCEPTATION',
        },
        () =>
          this.email.sendDonationAcceptedEmail(
            proposal.association.contact_email!,
            proposal.association.name,
            {
              name: proposal.donation.pharmacy.name,
              address: proposal.donation.pharmacy.address ?? '',
            },
            slotStart,
            slotEnd
          )
      );
    }

    // Générer et stocker l'image QR code sur S3 après le commit de l'allocation
    try {
      const allocation = await prisma.donationAllocation.findUnique({
        where: { proposal_id: proposal.proposal_id },
        select: { allocation_id: true, qr_code: true },
      });
      if (allocation) {
        const qrUrl = `${config.assoAppUrl}/pickup/${allocation.qr_code}`;
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          type: 'png',
          width: 300,
        });
        const qrCodeUrl = await this.storage.upload({
          key: `dons/qrcodes/${allocation.allocation_id}.png`,
          body: qrBuffer,
          contentType: 'image/png',
        });
        await prisma.donationAllocation.update({
          where: { allocation_id: allocation.allocation_id },
          data: { qr_code_url: qrCodeUrl },
        });
        this.logger.log(
          `[allocation ${allocation.allocation_id}] QR code uploadé → ${qrCodeUrl}`
        );
      }
    } catch (err) {
      // Non bloquant : le QR code peut être regénéré à la demande
      this.logger.warn(`QR code upload failed: ${err}`);
    }

    // Le reliquat n'est re-proposé qu'après commit de l'allocation (cas n°3)
    if (isPartial) {
      await this.proposeNext(proposal.donation_id);
    }
    return this.getProposalView(proposal.token);
  }

  // ── Annulation titulaire ───────────────────────────────────────────────────

  async cancelDonation(donationId: string, pharmacyId: string, userId: string) {
    const donation = await prisma.donation.findFirst({
      where: { donation_id: donationId, pharmacy_id: pharmacyId },
      include: { allocations: { where: { status: 'PLANIFIEE' } } },
    });
    if (!donation) throw new NotFoundException('Don introuvable');
    if (donation.status !== 'EN_COURS') {
      throw new BadRequestException(
        `Un don ${donation.status} ne peut pas être annulé`
      );
    }
    if (donation.allocations.length > 0) {
      throw new BadRequestException(
        'Un retrait est déjà planifié — le don ne peut plus être annulé'
      );
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.donation.updateMany({
        where: {
          donation_id: donationId,
          status: 'EN_COURS',
          version: donation.version,
        },
        data: { status: 'ANNULEE', version: { increment: 1 } },
      });
      if (claimed.count === 0) throw new ConflictException('Don déjà modifié');
      // La page asso encore ouverte recevra 409 → état « don annulé » (cas n°4)
      await tx.donationProposal.updateMany({
        where: { donation_id: donationId, status: 'ENVOYEE' },
        data: { status: 'SUPERSEDED' },
      });
      await tx.donationEvent.create({
        data: {
          donation_id: donationId,
          type: 'DON_ANNULE',
          actor: `TITULAIRE:${userId}`,
        },
      });
    });

    if (donation.action_id) {
      await prisma.action.updateMany({
        where: { action_id: donation.action_id },
        data: { status: 'EN_ATTENTE' },
      });
    }
    return prisma.donation.findUnique({ where: { donation_id: donationId } });
  }

  // ── Retrait ────────────────────────────────────────────────────────────────

  async confirmPickup(
    allocationId: string,
    pharmacyId: string,
    pickedUpBy: string,
    actor: string
  ) {
    const allocation = await prisma.donationAllocation.findFirst({
      where: {
        allocation_id: allocationId,
        donation: { pharmacy_id: pharmacyId },
      },
      include: { donation: true, association: true },
    });
    if (!allocation) throw new NotFoundException('Allocation introuvable');
    if (allocation.status !== 'PLANIFIEE') {
      throw new BadRequestException(
        `Retrait non confirmable (statut : ${allocation.status})`
      );
    }
    if (!pickedUpBy?.trim()) {
      throw new BadRequestException('Le nom du récupérateur est requis');
    }

    // Suffixe aléatoire : deux retraits confirmés dans la même milliseconde
    // ne doivent jamais partager un numéro de reçu fiscal
    const cerfaNumber = `CERFA-DON-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const lines = allocation.lines as unknown as DonationLineSnapshot[];

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.donationAllocation.updateMany({
        where: { allocation_id: allocationId, status: 'PLANIFIEE' },
        data: {
          status: 'RETIREE',
          picked_up_by: pickedUpBy.trim(),
          picked_up_at: new Date(),
          cerfa_number: cerfaNumber,
        },
      });
      if (claimed.count === 0) throw new ConflictException('Déjà confirmé');

      // Les quantités données sortent du stock à la confirmation de retrait
      // uniquement — le stock Savely peut diverger temporairement du LGO
      // jusqu'au prochain import (stock-truth tension, cas n°7)
      for (const line of lines) {
        const product = await tx.product.findUnique({
          where: { product_id: line.product_id },
        });
        if (product) {
          await tx.product.update({
            where: { product_id: line.product_id },
            data: {
              stock_quantity: Math.max(
                0,
                product.stock_quantity - line.quantity
              ),
            },
          });
        }
      }

      await tx.donationEvent.create({
        data: {
          donation_id: allocation.donation_id,
          type: 'RETRAIT_CONFIRME',
          actor,
          payload: {
            association_name: allocation.association.name,
            picked_up_by: pickedUpBy.trim(),
            cerfa_number: cerfaNumber,
            lines: allocation.lines as object[],
          },
        },
      });
    });

    // Cerfa envoyé à l'asso + disponible côté titulaire (endpoint PDF)
    // Le PDF est aussi stocké sur S3 pour consultation ultérieure (cerfa_url)
    try {
      const pdf = await this.cerfa.generateCerfa(allocationId, pharmacyId);
      const cerfaUrl = await this.storage.upload({
        key: `dons/cerfa/${allocationId}/cerfa-${cerfaNumber}.pdf`,
        body: pdf,
        contentType: 'application/pdf',
      });
      await prisma.donationAllocation.update({
        where: { allocation_id: allocationId },
        data: { cerfa_url: cerfaUrl },
      });
      this.logger.log(
        `[allocation ${allocationId}] Cerfa uploadé → ${cerfaUrl}`
      );

      if (allocation.association.contact_email) {
        await this.sendOnce(
          { allocation_id: allocationId, email_type: 'CONFIRMATION_RETRAIT' },
          () =>
            this.email.sendPickupConfirmedEmail(
              allocation.association.contact_email!,
              allocation.association.name,
              pdf
            )
        );
      }
    } catch (err) {
      // Fallback : générer le Cerfa à la volée si l'upload échoue
      this.logger.error(`Cerfa upload failed, falling back to on-the-fly: ${err}`);
      if (allocation.association.contact_email) {
        await this.sendOnce(
          { allocation_id: allocationId, email_type: 'CONFIRMATION_RETRAIT' },
          async () => {
            const pdf = await this.cerfa.generateCerfa(allocationId, pharmacyId);
            await this.email.sendPickupConfirmedEmail(
              allocation.association.contact_email!,
              allocation.association.name,
              pdf
            );
          }
        );
      }
    }

    await this.completeIfDone(allocation.donation_id);
    return prisma.donationAllocation.findUnique({
      where: { allocation_id: allocationId },
    });
  }

  /**
   * Confirmation par scan du QR de l'allocation (app Flutter préparateur).
   * Résout l'allocation dans le périmètre de l'officine puis délègue au flux
   * de confirmation standard.
   */
  async confirmPickupByQr(
    qrCode: string,
    pharmacyId: string,
    pickedUpBy: string,
    actor: string
  ) {
    const allocation = await prisma.donationAllocation.findFirst({
      where: { qr_code: qrCode, donation: { pharmacy_id: pharmacyId } },
    });
    if (!allocation) {
      throw new NotFoundException('QR inconnu pour cette officine');
    }
    return this.confirmPickup(
      allocation.allocation_id,
      pharmacyId,
      pickedUpBy,
      actor
    );
  }

  private async completeIfDone(donationId: string) {
    const donation = await prisma.donation.findUnique({
      where: { donation_id: donationId },
      include: {
        lines: true,
        allocations: { where: { status: 'PLANIFIEE' } },
        proposals: { where: { status: 'ENVOYEE' } },
      },
    });
    if (!donation || donation.status !== 'EN_COURS') return;
    const fullyAllocated = donation.lines.every(
      (l) => l.quantity_allocated >= l.quantity_total
    );
    if (
      !fullyAllocated ||
      donation.allocations.length > 0 ||
      donation.proposals.length > 0
    ) {
      return;
    }
    const done = await prisma.donation.updateMany({
      where: { donation_id: donationId, status: 'EN_COURS' },
      data: { status: 'COMPLETEE', version: { increment: 1 } },
    });
    if (done.count > 0) {
      await prisma.donationEvent.create({
        data: {
          donation_id: donationId,
          type: 'DON_COMPLETE',
          actor: 'SYSTEM',
        },
      });
      this.logger.log(`[don ${donationId}] COMPLETEE`);
    }
  }

  // ── Traitements périodiques (appelés par le cron horaire) ─────────────────

  /** Proposals ENVOYEE dépassant expires_at → EXPIREE → cascade. */
  async expireOverdueProposals(now: Date = new Date()): Promise<number> {
    const overdue = await prisma.donationProposal.findMany({
      where: { status: 'ENVOYEE', expires_at: { lt: now } },
      select: { proposal_id: true, donation_id: true },
    });
    for (const proposal of overdue) {
      await this.expireProposal(proposal.proposal_id, proposal.donation_id);
    }
    return overdue.length;
  }

  private async expireProposal(proposalId: string, donationId: string) {
    const claimed = await prisma.donationProposal.updateMany({
      where: { proposal_id: proposalId, status: 'ENVOYEE' },
      data: { status: 'EXPIREE', responded_at: new Date() },
    });
    if (claimed.count === 0) return;
    await prisma.donationEvent.create({
      data: {
        donation_id: donationId,
        type: 'PROPOSITION_EXPIREE',
        actor: 'SYSTEM',
        payload: { proposal_id: proposalId },
      },
    });
    await this.proposeNext(donationId);
  }

  /** Relance email à mi-délai de réponse (idempotent via DonationEmailLog). */
  async sendResponseReminders(now: Date = new Date()): Promise<number> {
    const pending = await prisma.donationProposal.findMany({
      where: { status: 'ENVOYEE', expires_at: { gt: now } },
      include: { association: true, donation: { include: { pharmacy: true } } },
    });
    let sent = 0;
    for (const proposal of pending) {
      const midpoint =
        proposal.sent_at.getTime() +
        (proposal.expires_at.getTime() - proposal.sent_at.getTime()) / 2;
      if (now.getTime() < midpoint) continue;
      if (!proposal.association.contact_email) continue;
      const didSend = await this.sendOnce(
        { proposal_id: proposal.proposal_id, email_type: 'RELANCE_MI_DELAI' },
        () =>
          this.email.sendDonationReminderEmail(
            proposal.association.contact_email!,
            proposal.association.name,
            `${config.frontUrl}/don/${proposal.token}`,
            proposal.expires_at
          )
      );
      if (didSend) sent++;
    }
    return sent;
  }

  /** Rappels J-3 et J-1 avant le créneau de retrait. */
  async sendPickupReminders(now: Date = new Date()): Promise<number> {
    const upcoming = await prisma.donationAllocation.findMany({
      where: {
        status: 'PLANIFIEE',
        pickup_slot_start: {
          gt: now,
          lt: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
        },
      },
      include: { association: true, donation: { include: { pharmacy: true } } },
    });
    let sent = 0;
    for (const allocation of upcoming) {
      if (!allocation.association.contact_email) continue;
      const daysLeft = Math.ceil(
        (allocation.pickup_slot_start.getTime() - now.getTime()) /
          (24 * 3600 * 1000)
      );
      const emailType =
        daysLeft <= 1 ? 'RAPPEL_J1' : daysLeft === 3 ? 'RAPPEL_J3' : null;
      if (!emailType) continue;
      const didSend = await this.sendOnce(
        { allocation_id: allocation.allocation_id, email_type: emailType },
        () =>
          this.email.sendPickupReminderEmail(
            allocation.association.contact_email!,
            allocation.association.name,
            allocation.donation.pharmacy.name,
            allocation.pickup_slot_start,
            daysLeft
          )
      );
      if (didSend) sent++;
    }
    return sent;
  }

  /** Créneau + 24 h sans confirmation → NON_RECUPEREE → reliquat re-proposé. */
  async handleMissedPickups(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - MISSED_PICKUP_GRACE_HOURS * 3600 * 1000
    );
    const missed = await prisma.donationAllocation.findMany({
      where: { status: 'PLANIFIEE', pickup_slot_end: { lt: cutoff } },
      include: {
        association: true,
        donation: { include: { pharmacy: true, lines: true } },
      },
    });
    for (const allocation of missed) {
      const lines = allocation.lines as unknown as DonationLineSnapshot[];
      const claimed = await prisma.$transaction(async (tx) => {
        const updated = await tx.donationAllocation.updateMany({
          where: {
            allocation_id: allocation.allocation_id,
            status: 'PLANIFIEE',
          },
          data: { status: 'NON_RECUPEREE' },
        });
        if (updated.count === 0) return false;
        // Les quantités retournent au reliquat ; la fiabilité de l'asso baisse
        // mécaniquement (ratio RETIREE / (RETIREE + NON_RECUPEREE))
        for (const line of lines) {
          await tx.donationLine.updateMany({
            where: {
              donation_id: allocation.donation_id,
              product_id: line.product_id,
            },
            data: { quantity_allocated: { decrement: line.quantity } },
          });
        }
        await tx.donationEvent.create({
          data: {
            donation_id: allocation.donation_id,
            type: 'RETRAIT_MANQUE',
            actor: 'SYSTEM',
            payload: {
              association_id: allocation.association_id,
              association_name: allocation.association.name,
              lines: allocation.lines as object[],
            },
          },
        });
        return true;
      });
      if (!claimed) continue;

      const summary = lines.map((l) => `${l.name} ×${l.quantity}`).join(', ');
      if (allocation.association.contact_email) {
        await this.sendOnce(
          {
            allocation_id: allocation.allocation_id,
            email_type: 'NON_RECUPERATION_ASSO',
          },
          () =>
            this.email.sendPickupMissedAssociationEmail(
              allocation.association.contact_email!,
              allocation.association.name,
              allocation.donation.pharmacy.name
            )
        );
      }
      await this.sendOnce(
        {
          allocation_id: allocation.allocation_id,
          email_type: 'NON_RECUPERATION_PHARMACIE',
        },
        () =>
          this.email.sendPickupMissedPharmacyEmail(
            allocation.donation.pharmacy.email,
            allocation.association.name,
            summary
          )
      );
      // L'asso fautive est déjà sollicitée sur ce don → exclue de la cascade
      await this.proposeNext(allocation.donation_id);
    }
    return missed.length;
  }

  // ── Échec ──────────────────────────────────────────────────────────────────

  private async failDonation(
    donation: {
      donation_id: string;
      action_id: string | null;
      version: number;
      pharmacy: { email: string };
    },
    remaining: { name: string; quantity: number }[],
    reason: string
  ) {
    const claimed = await prisma.donation.updateMany({
      where: {
        donation_id: donation.donation_id,
        status: 'EN_COURS',
        version: donation.version,
      },
      data: { status: 'ECHOUEE', version: { increment: 1 } },
    });
    if (claimed.count === 0) return;

    await prisma.donationProposal.updateMany({
      where: { donation_id: donation.donation_id, status: 'ENVOYEE' },
      data: { status: 'SUPERSEDED' },
    });
    await prisma.donationEvent.create({
      data: {
        donation_id: donation.donation_id,
        type: 'DON_ECHOUE',
        actor: 'SYSTEM',
        payload: {
          reason,
          remaining: remaining as unknown as object[],
        },
      },
    });
    // L'action revient au centre d'actions — le titulaire revoit le lot avec
    // le bandeau d'échec et les suggestions alternatives
    if (donation.action_id) {
      await prisma.action.updateMany({
        where: { action_id: donation.action_id },
        data: { status: 'EN_ATTENTE' },
      });
    }
    const summary = remaining.map((l) => `${l.name} ×${l.quantity}`).join(', ');
    try {
      await this.email.sendDonationFailedEmail(
        donation.pharmacy.email,
        summary
      );
    } catch (err) {
      this.logger.warn(`Email échec don non envoyé : ${String(err)}`);
    }
    this.logger.warn(`[don ${donation.donation_id}] ECHOUEE (${reason})`);
  }

  // ── Vue publique d'une proposition (page /don/:token) ─────────────────────

  private async buildView(proposal: {
    proposal_id: string;
    status: string;
    token: string;
    proposed_lines: unknown;
    refusal_reason: string | null;
    sent_at: Date;
    responded_at: Date | null;
    expires_at: Date;
    donation: {
      donation_id: string;
      status: string;
      pharmacy: {
        name: string;
        address: string | null;
        donation_pickup_windows?: unknown;
      };
    };
    association: {
      name: string;
      pickup_sla_days: number;
      pickup_windows?: unknown;
    };
    allocation: {
      lines: unknown;
      status: string;
      pickup_slot_start: Date;
      pickup_slot_end: Date;
      cerfa_number: string | null;
      qr_code: string;
    } | null;
  }) {
    const base = {
      association_name: proposal.association.name,
      pharmacy: {
        name: proposal.donation.pharmacy.name,
        address: proposal.donation.pharmacy.address,
      },
      lines: proposal.proposed_lines,
      expires_at: proposal.expires_at,
    };

    if (proposal.donation.status === 'ANNULEE') {
      return { state: 'DON_ANNULE', ...base };
    }
    if (proposal.status === 'ENVOYEE') {
      if (
        proposal.expires_at < new Date() ||
        proposal.donation.status !== 'EN_COURS'
      ) {
        return { state: 'EXPIREE', ...base };
      }
      const windows = intersectWindows(
        parsePickupWindows(proposal.donation.pharmacy.donation_pickup_windows),
        proposal.association.pickup_windows
      );
      return {
        state: 'ACTIVE',
        ...base,
        slots: computePickupSlots(
          windows,
          proposal.association.pickup_sla_days
        ),
      };
    }
    if (
      proposal.status === 'ACCEPTEE' ||
      proposal.status === 'ACCEPTEE_PARTIELLEMENT'
    ) {
      return {
        state: 'ACCEPTEE',
        ...base,
        allocation: proposal.allocation
          ? {
              lines: proposal.allocation.lines,
              status: proposal.allocation.status,
              pickup_slot_start: proposal.allocation.pickup_slot_start,
              pickup_slot_end: proposal.allocation.pickup_slot_end,
              cerfa_available: proposal.allocation.cerfa_number != null,
              // QR à présenter au retrait : scanné par le préparateur pour
              // confirmer le pickup (uniquement tant que le retrait est dû)
              qr_code:
                proposal.allocation.status === 'PLANIFIEE'
                  ? proposal.allocation.qr_code
                  : null,
            }
          : null,
      };
    }
    if (proposal.status === 'REFUSEE') {
      return { state: 'REFUSEE', ...base };
    }
    if (proposal.status === 'SUPERSEDED') {
      // Lot attribué à une autre asso ou reliquat re-proposé
      return { state: 'REMPLACEE', ...base };
    }
    return { state: 'EXPIREE', ...base };
  }

  // ── Idempotence des envois (le cron ne renvoie jamais deux fois) ──────────

  private async sendOnce(
    key: { proposal_id?: string; allocation_id?: string; email_type: string },
    send: () => Promise<void>
  ): Promise<boolean> {
    try {
      await prisma.donationEmailLog.create({
        data: {
          proposal_id: key.proposal_id ?? null,
          allocation_id: key.allocation_id ?? null,
          email_type: key.email_type,
        },
      });
    } catch {
      // Violation d'unicité : déjà envoyé
      return false;
    }
    try {
      await send();
      return true;
    } catch (err) {
      this.logger.warn(
        `Email ${key.email_type} non envoyé : ${err instanceof Error ? err.message : err}`
      );
      return false;
    }
  }
}
