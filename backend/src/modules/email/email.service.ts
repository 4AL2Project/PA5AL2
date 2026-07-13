// Roger — v1.0
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

import { config } from '../../core/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClient: Resend | null = null;
  private smtpTransport: Transporter | null = null;

  private getResend(): Resend {
    if (!this.resendClient) {
      this.resendClient = new Resend(config.email.apiKey);
    }
    return this.resendClient;
  }

  private getSmtpTransport(): Transporter {
    if (!this.smtpTransport) {
      this.smtpTransport = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: false,
        ignoreTLS: true,
      });
    }
    return this.smtpTransport;
  }

  private async send(
    payload: Parameters<Resend['emails']['send']>[0]
  ): Promise<void> {
    if (config.email.transport === 'smtp') {
      try {
        const info = await this.getSmtpTransport().sendMail({
          from: payload.from,
          to: payload.to as string | string[],
          subject: payload.subject,
          html: payload.html,
          attachments: payload.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content as Buffer,
          })),
        });
        this.logger.log(
          `Email (SMTP) sent to ${payload.to} (id: ${info.messageId})`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`SMTP error sending to ${payload.to}: ${message}`);
        throw new InternalServerErrorException(`Email non envoyé : ${message}`);
      }
      return;
    }

    const { data, error } = await this.getResend().emails.send(payload);
    if (error) {
      this.logger.error(
        `Resend error sending to ${payload.to}: ${error.message}`
      );
      throw new InternalServerErrorException(
        `Email non envoyé : ${error.message}`
      );
    }
    this.logger.log(`Email sent to ${payload.to} (id: ${data?.id})`);
  }

  async sendInvitationEmail(to: string, link: string): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Bienvenue sur Savely -- Finalisez votre compte',
      html: `
        <p>Bonjour,</p>
        <p>Vous avez ete invite(e) a rejoindre Savely.</p>
        <p>Cliquez sur le lien ci-dessous pour finaliser votre compte :</p>
        <p><a href="${link}">${link}</a></p>
        <p>Ce lien expire dans 48 heures.</p>
      `,
    });
  }

  async sendMagicLinkEmail(to: string, link: string): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Votre lien de connexion',
      html: `
        <p>Bonjour,</p>
        <p>Voici votre lien de connexion a Savely :</p>
        <p><a href="${link}">${link}</a></p>
        <p>Ce lien expire dans 15 minutes.</p>
      `,
    });
  }

  async sendOtpCodeEmail(
    to: string,
    code: string,
    ttlMs: number = config.auth.customerOtpTtlMs
  ): Promise<void> {
    const ttlMinutes = Math.round(ttlMs / 60000);
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Votre code de connexion',
      html: `
        <p>Bonjour,</p>
        <p>Voici votre code de connexion a Savely :</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${code}</p>
        <p>Ce code expire dans ${ttlMinutes} minutes.</p>
        <p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
      `,
    });
  }

  // ── Cycle de vie association ───────────────────────────────────────────────

  async sendAssociationVerificationEmail(
    to: string,
    name: string,
    link: string
  ): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Confirmez votre adresse email',
      html: `
        <p>Bonjour ${name},</p>
        <p>Merci pour votre inscription sur Savely.</p>
        <p>Confirmez votre adresse email pour que nous puissions examiner votre demande :</p>
        <p><a href="${link}">${link}</a></p>
        <p>Ce lien expire dans 48 heures.</p>
      `,
    });
  }

  async sendAssociationUnderReviewEmail(to: string, name: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Savely -- Votre demande est en cours d'examen",
      html: `
        <p>Bonjour ${name},</p>
        <p>Votre adresse email est confirmee. Notre equipe examine votre demande
        d'inscription : vous recevrez une reponse sous quelques jours.</p>
      `,
    });
  }

  async sendAssociationValidatedEmail(to: string, name: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Votre association est validee',
      html: `
        <p>Bonjour ${name},</p>
        <p>Votre association est validee sur Savely. Vous recevrez desormais par
        email des propositions de dons de produits des officines de votre zone
        d'action. Aucun compte n'est necessaire : tout se passe via les liens
        que nous vous envoyons.</p>
      `,
    });
  }

  async sendAssociationRejectedEmail(to: string, name: string, reason: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Savely -- Votre demande n'a pas ete retenue",
      html: `
        <p>Bonjour ${name},</p>
        <p>Apres examen, votre demande d'inscription n'a pas ete retenue.</p>
        ${reason ? `<p>Motif : ${reason}</p>` : ''}
        <p>Vous pouvez nous contacter pour plus d'informations.</p>
      `,
    });
  }

  // ── Cycle de vie don ───────────────────────────────────────────────────────

  async sendDonationProposalEmail(
    to: string,
    assoName: string,
    pharmacyName: string,
    link: string,
    expiresAt: Date
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: `Savely -- ${pharmacyName} vous propose un don de produits`,
      html: `
        <p>Bonjour ${assoName},</p>
        <p>La pharmacie <strong>${pharmacyName}</strong> souhaite vous donner un
        lot de produits (parapharmacie / cosmetique).</p>
        <p>Consultez le detail et repondez ici :</p>
        <p><a href="${link}">${link}</a></p>
        <p>Sans reponse de votre part avant le
        ${expiresAt.toLocaleString('fr-FR')}, la proposition sera transmise a
        une autre association.</p>
      `,
    });
  }

  async sendDonationReminderEmail(
    to: string,
    assoName: string,
    link: string,
    expiresAt: Date
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Rappel : une proposition de don vous attend',
      html: `
        <p>Bonjour ${assoName},</p>
        <p>Vous n'avez pas encore repondu a la proposition de don en cours.</p>
        <p><a href="${link}">${link}</a></p>
        <p>Elle expire le ${expiresAt.toLocaleString('fr-FR')}.</p>
      `,
    });
  }

  async sendDonationAcceptedEmail(
    to: string,
    assoName: string,
    pharmacy: { name: string; address: string },
    slotStart: Date,
    slotEnd: Date
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Don confirme : votre creneau de retrait',
      html: `
        <p>Bonjour ${assoName},</p>
        <p>Votre acceptation est enregistree. Retrait du lot :</p>
        <p><strong>${slotStart.toLocaleString('fr-FR')} - ${slotEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></p>
        <p>Pharmacie ${pharmacy.name}<br/>${pharmacy.address}</p>
        <p>Pensez a indiquer le nom de la personne qui viendra recuperer le lot.</p>
      `,
    });
  }

  async sendPickupReminderEmail(
    to: string,
    assoName: string,
    pharmacyName: string,
    slotStart: Date,
    daysLeft: number
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: `Savely -- Retrait de votre don dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
      html: `
        <p>Bonjour ${assoName},</p>
        <p>Rappel : le retrait de votre don a la pharmacie ${pharmacyName} est
        prevu le <strong>${slotStart.toLocaleString('fr-FR')}</strong>.</p>
      `,
    });
  }

  async sendPickupConfirmedEmail(
    to: string,
    assoName: string,
    cerfaPdf: Buffer
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Retrait confirme, votre recu fiscal est joint',
      html: `
        <p>Bonjour ${assoName},</p>
        <p>Le retrait de votre don est confirme. Vous trouverez le recu Cerfa
        en piece jointe.</p>
        <p>Merci pour votre action.</p>
      `,
      attachments: [{ filename: 'recu-cerfa.pdf', content: cerfaPdf }],
    });
  }

  async sendPickupMissedAssociationEmail(
    to: string,
    assoName: string,
    pharmacyName: string
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Retrait non effectue',
      html: `
        <p>Bonjour ${assoName},</p>
        <p>Le retrait prevu a la pharmacie ${pharmacyName} n'a pas ete effectue
        dans le delai. Le lot est repropose a une autre association.</p>
        <p>Ce manquement est pris en compte dans votre fiabilite Savely.</p>
      `,
    });
  }

  async sendPickupMissedPharmacyEmail(
    to: string,
    assoName: string,
    productSummary: string
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Savely -- Un retrait de don n'a pas eu lieu",
      html: `
        <p>Bonjour,</p>
        <p>L'association ${assoName} n'est pas venue recuperer le lot
        (${productSummary}) dans le delai prevu.</p>
        <p>Savely repropose automatiquement ces produits a une autre
        association : vous n'avez rien a faire.</p>
      `,
    });
  }

  async sendDonationFailedEmail(to: string, productSummary: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Savely -- Un don n'a pas trouve preneur",
      html: `
        <p>Bonjour,</p>
        <p>Malgre plusieurs propositions, le don (${productSummary}) n'a pas
        trouve preneur. L'action est revenue dans votre centre d'actions avec
        des suggestions alternatives.</p>
      `,
    });
  }
}
