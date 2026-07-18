import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

import { config } from '../../core/config';

// ── HTML helpers ──────────────────────────────────────────────────────────────

/** Wraps content in the shared Savely email shell (max-width 560px, centered). */
function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background-color:#16a34a;padding:20px 32px;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Savely</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              Savely — La plateforme de valorisation des stocks dormants pour officines<br>
              <a href="https://savely.fr" style="color:#16a34a;text-decoration:none;">savely.fr</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Primary call-to-action button. */
function btn(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#16a34a;border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;
}

/** Section heading. */
function h1(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${text}</h1>`;
}

/** Body paragraph. */
function p(text: string): string {
  return `<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.6;">${text}</p>`;
}

/** Small muted text. */
function small(text: string): string {
  return `<p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;line-height:1.5;">${text}</p>`;
}

/** Horizontal divider. */
function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">`;
}

/** Highlighted info box (green tint) for key messages. */
function highlightBox(text: string): string {
  return `<div style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;padding:12px 16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#15803d;line-height:1.5;">${text}</p>
</div>`;
}

/** Green info box (legacy — used in existing templates). */
function infoBox(content: string): string {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">${content}</div>`;
}

/** Amber warning box (legacy — used in existing templates). */
function warnBox(content: string): string {
  return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">${content}</div>`;
}

/** Footer legal/info mention in small muted style. */
function footerMention(text: string): string {
  return `<p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">${text}</p>`;
}

export interface DonationProductLine {
  name: string;
  quantity: number;
  unitPriceHt: number;
}

/** HTML table listing donation product lines with totals. */
function productTable(products: DonationProductLine[]): string {
  const totalHt = products.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceHt,
    0
  );

  const rows = products
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${item.name}</td>
          <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:right;">${(item.quantity * item.unitPriceHt).toFixed(2)} €</td>
        </tr>`
    )
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:16px 0;">
  <thead>
    <tr style="background-color:#f9fafb;">
      <th style="padding:10px 12px;font-size:13px;font-weight:600;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;">Produit</th>
      <th style="padding:10px 12px;font-size:13px;font-weight:600;color:#6b7280;text-align:center;border-bottom:1px solid #e5e7eb;">Qté</th>
      <th style="padding:10px 12px;font-size:13px;font-weight:600;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb;">Valeur HT</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr style="background-color:#f0fdf4;">
      <td colspan="2" style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;">Total HT</td>
      <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${totalHt.toFixed(2)} €</td>
    </tr>
  </tfoot>
</table>`;
}

// ── Service ───────────────────────────────────────────────────────────────────

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
      subject: 'Bienvenue sur Savely — Finalisez votre compte',
      html: emailLayout(`
        ${h1('Bienvenue sur Savely')}
        ${p('Vous avez été invité(e) à rejoindre Savely.')}
        ${p('Cliquez ci-dessous pour finaliser votre compte :')}
        ${btn('Finaliser mon compte', link)}
        ${small('Ce lien expire dans 48 heures.')}
      `),
    });
  }

  async sendMagicLinkEmail(to: string, link: string): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely — Votre lien de connexion',
      html: emailLayout(`
        ${h1('Connexion à Savely')}
        ${p('Voici votre lien de connexion :')}
        ${btn('Me connecter', link)}
        ${small("Ce lien expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.")}
      `),
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
      subject: 'Savely — Votre code de connexion',
      html: emailLayout(`
        ${h1('Votre code de connexion')}
        ${p("Saisissez ce code dans l'application Savely :")}
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#16a34a;font-variant-numeric:tabular-nums;">${code}</span>
        </div>
        ${small(`Ce code expire dans ${ttlMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`)}
      `),
    });
  }

  // ── Cycle de vie association ───────────────────────────────────────────────

  /**
   * Template 3 — Magic link invitation pour une association
   * Invite une association à créer son espace sur Savely.
   */
  async sendAssociationVerificationEmail(
    to: string,
    name: string,
    link: string
  ): Promise<void> {
    const html = emailLayout(`
      ${h1('Bienvenue sur Savely — Activez votre espace association')}
      ${p(`Bonjour ${name},`)}
      ${p('Savely est la plateforme qui connecte les officines avec des associations comme la vôtre pour donner une seconde vie aux produits de parapharmacie invendus. Aucun compte ni mot de passe requis : tout se passe via les liens que nous vous envoyons.')}
      ${divider()}
      ${p('Cliquez sur le bouton ci-dessous pour activer votre espace et commencer à recevoir des propositions de dons.')}
      ${btn('Activer mon espace', link)}
      ${highlightBox('Ce lien est valable 7 jours. Après cette date, contactez-nous pour recevoir un nouveau lien.')}
      ${divider()}
      ${footerMention("Si vous n'êtes pas concerné(e) par cette invitation, ignorez simplement cet email — aucune action n'est nécessaire.")}
    `);

    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely — Confirmez votre adresse email',
      html,
    });
  }

  async sendAssociationUnderReviewEmail(to: string, name: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Savely — Votre demande est en cours d'examen",
      html: emailLayout(`
        ${h1(`Bonjour ${name},`)}
        ${p("Votre adresse email est confirmée. Notre équipe examine votre demande d'inscription et vous enverra une réponse sous quelques jours.")}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#166534;">✅ Email confirmé — dossier en cours d'examen</p>`)}
      `),
    });
  }

  async sendAssociationValidatedEmail(to: string, name: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely — Votre association est validée',
      html: emailLayout(`
        ${h1(`Bienvenue, ${name} !`)}
        ${p("Votre association est maintenant validée sur Savely. Vous recevrez par email des propositions de dons de produits des officines de votre zone d'action.")}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#166534;">🎉 Association validée — propositions de dons à venir</p>`)}
        ${p("Aucun compte n'est nécessaire : tout se passe via les liens que nous vous envoyons.")}
      `),
    });
  }

  async sendAssociationRejectedEmail(to: string, name: string, reason: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Savely — Votre demande n'a pas été retenue",
      html: emailLayout(`
        ${h1(`Bonjour ${name},`)}
        ${p("Après examen, votre demande d'inscription n'a pas été retenue.")}
        ${reason ? `${warnBox(`<p style="margin:0;font-size:13px;color:#92400e;">Motif : ${reason}</p>`)}` : ''}
        ${p("N'hésitez pas à nous contacter pour plus d'informations.")}
      `),
    });
  }

  // ── Cycle de vie don ───────────────────────────────────────────────────────

  /**
   * Template 1 — Offre de don à une association (proposition)
   * Envoyé à l'asso quand une pharmacie propose un don.
   */
  async sendDonationProposalEmail(
    to: string,
    assoName: string,
    pharmacyName: string,
    link: string,
    expiresAt: Date,
    pharmacyAddress?: string,
    products?: DonationProductLine[]
  ) {
    const totalHt =
      products && products.length > 0
        ? products
            .reduce((sum, item) => sum + item.quantity * item.unitPriceHt, 0)
            .toFixed(2)
        : null;

    const productsSection =
      products && products.length > 0
        ? `${divider()}
           <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#111827;">Détail des produits proposés</p>
           ${productTable(products)}
           ${totalHt ? highlightBox(`Valeur totale HT du don : <strong>${totalHt} €</strong>`) : ''}`
        : '';

    const pharmacyInfo = pharmacyAddress
      ? `${pharmacyName} — ${pharmacyAddress}`
      : pharmacyName;

    const html = emailLayout(`
      ${h1('Une officine vous propose un don associatif')}
      ${p(`Bonjour ${assoName},`)}
      ${p(`La pharmacie <strong>${pharmacyInfo}</strong> souhaite vous faire don d'un lot de produits de parapharmacie / cosmétique.`)}
      ${productsSection}
      ${divider()}
      ${p("Consultez le détail de l'offre et acceptez ou refusez en cliquant sur le bouton ci-dessous.")}
      ${btn("Voir l'offre", link)}
      ${highlightBox(`Sans réponse de votre part avant le <strong>${expiresAt.toLocaleString('fr-FR')}</strong>, la proposition sera transmise à une autre association.`)}
      ${divider()}
      ${p('Après récupération du lot, Savely vous transmettra automatiquement le reçu fiscal Cerfa 16216 vous permettant de justifier ce don auprès de vos donateurs et partenaires.')}
      ${footerMention('Cet email vous a été envoyé car votre association est référencée sur Savely. Pour toute question : contact@savely.fr')}
    `);

    await this.send({
      from: config.email.from,
      to,
      subject: `Savely — ${pharmacyName} vous propose un don de produits`,
      html,
    });
  }

  /**
   * Template 4 — Rappel offre non répondue (J-3 ou J-1 avant expiration)
   * Ton urgent mais courtois.
   */
  async sendDonationReminderEmail(
    to: string,
    assoName: string,
    link: string,
    expiresAt: Date
  ) {
    const html = emailLayout(`
      ${h1('Rappel : une offre de don expire bientôt')}
      ${p(`Bonjour ${assoName},`)}
      ${p("Vous avez reçu une proposition de don de produits de parapharmacie et n'y avez pas encore répondu.")}
      ${highlightBox(`Cette offre expire le <strong>${expiresAt.toLocaleString('fr-FR')}</strong>. Passé ce délai, elle sera automatiquement transmise à une autre association.`)}
      ${p("Si vous souhaitez accepter ce don, consultez l'offre dès maintenant :")}
      ${btn("Voir l'offre", link)}
      ${divider()}
      ${footerMention('Si vous avez déjà répondu à cette offre, ignorez ce message. Pour toute question : contact@savely.fr')}
    `);

    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely — Rappel : une proposition de don vous attend',
      html,
    });
  }

  async sendDonationAcceptedEmail(
    to: string,
    assoName: string,
    pharmacy: { name: string; address: string },
    slotStart: Date,
    slotEnd: Date
  ) {
    const slot = `${slotStart.toLocaleString('fr-FR')} – ${slotEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    await this.send({
      from: config.email.from,
      to,
      subject: 'Don confirmé — votre créneau de retrait',
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p('Votre acceptation est enregistrée. Voici les détails du retrait :')}
        ${infoBox(`
          <p style="margin:0 0 4px;font-size:13px;color:#166534;font-weight:600;">📅 ${slot}</p>
          <p style="margin:0;font-size:13px;color:#166534;">${pharmacy.name} · ${pharmacy.address}</p>
        `)}
        ${p('Pensez à vous munir du QR code disponible dans votre espace Savely lors du retrait.')}
      `),
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
      subject: `Retrait de votre don dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p(`Rappel : le retrait de votre don à la pharmacie <strong>${pharmacyName}</strong> est prévu le <strong>${slotStart.toLocaleString('fr-FR')}</strong>.`)}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#166534;">📅 J-${daysLeft} — pensez à préparer votre équipe de bénévoles.</p>`)}
      `),
    });
  }

  /**
   * Template 2 — Confirmation retrait (Cerfa)
   * Envoyé après confirmation de retrait, avec le Cerfa en pièce jointe.
   */
  async sendPickupConfirmedEmail(
    to: string,
    assoName: string,
    cerfaPdf: Buffer,
    donationInfo?: {
      pharmacyName?: string;
      donationDate?: Date;
      totalHt?: number;
    }
  ) {
    const donationDetails =
      donationInfo &&
      (donationInfo.pharmacyName ||
        donationInfo.donationDate ||
        donationInfo.totalHt)
        ? `${divider()}
           <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#111827;">Récapitulatif du don</p>
           ${donationInfo.pharmacyName ? p(`Pharmacie donateur : <strong>${donationInfo.pharmacyName}</strong>`) : ''}
           ${donationInfo.donationDate ? p(`Date du retrait : <strong>${donationInfo.donationDate.toLocaleDateString('fr-FR')}</strong>`) : ''}
           ${donationInfo.totalHt ? highlightBox(`Valeur déclarée HT du don : <strong>${donationInfo.totalHt.toFixed(2)} €</strong>`) : ''}`
        : '';

    const html = emailLayout(`
      ${h1('Votre reçu fiscal Cerfa est disponible')}
      ${p(`Bonjour ${assoName},`)}
      ${p('Le retrait de votre lot de produits est bien confirmé. Merci pour votre engagement associatif.')}
      ${donationDetails}
      ${divider()}
      ${p('Le reçu fiscal <strong>Cerfa n° 16216</strong> est joint à cet email en pièce jointe PDF. Conservez-le précieusement.')}
      ${highlightBox("Ce reçu vous permet de bénéficier d'une <strong>réduction fiscale de 60 %</strong> sur la valeur du don (art. 238 bis CGI). Il constitue la pièce justificative officielle à conserver pour votre comptabilité et vos obligations déclaratives.")}
      ${divider()}
      ${footerMention('Ce reçu a été généré automatiquement par Savely. Pour toute question relative au Cerfa : contact@savely.fr')}
    `);

    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely — Retrait confirmé, votre reçu fiscal est joint',
      html,
      attachments: [{ filename: 'recu-cerfa-16216.pdf', content: cerfaPdf }],
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
      subject: 'Retrait non effectué',
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p(`Le retrait prévu à la pharmacie <strong>${pharmacyName}</strong> n'a pas été effectué dans le délai. Le lot est reproposé à une autre association.`)}
        ${warnBox(`<p style="margin:0;font-size:13px;color:#92400e;">⚠️ Ce manquement est pris en compte dans votre indice de fiabilité Savely.</p>`)}
      `),
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
      subject: "Un retrait de don n'a pas eu lieu",
      html: emailLayout(`
        ${h1('Retrait non effectué')}
        ${p(`L'association <strong>${assoName}</strong> n'est pas venue récupérer le lot (${productSummary}) dans le délai prévu.`)}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#166534;">🔄 Savely repropose automatiquement ces produits à une autre association — vous n'avez rien à faire.</p>`)}
      `),
    });
  }

  async sendAssoMagicLinkEmail(
    to: string,
    assoName: string,
    link: string
  ): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: `Accédez à votre espace Savely`,
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p("Voici votre lien d'accès à votre espace association Savely :")}
        ${btn('Accéder à mon espace', link)}
        ${small("Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.")}
      `),
    });
  }

  async sendDonationCancelledByPharmacyEmail(
    to: string,
    assoName: string,
    pharmacyName: string,
    productSummary: string,
    slotStart: Date
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: `Don annulé par la pharmacie ${pharmacyName}`,
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p(`La pharmacie <strong>${pharmacyName}</strong> a annulé le don de produits (${productSummary}) prévu le <strong>${slotStart.toLocaleString('fr-FR')}</strong>.`)}
        ${warnBox(`<p style="margin:0;font-size:13px;color:#92400e;">Nous sommes désolés de cet inconvénient. D'autres propositions pourront vous parvenir prochainement.</p>`)}
      `),
    });
  }

  async sendCerfaToPharmacyEmail(
    to: string,
    assoName: string,
    productSummary: string,
    cerfaPdf: Buffer
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: `Reçu Cerfa disponible (don à ${assoName})`,
      html: emailLayout(`
        ${h1('Reçu fiscal Cerfa disponible')}
        ${p(`Le retrait du don (${productSummary}) par <strong>${assoName}</strong> a été confirmé. Vous trouverez le reçu fiscal Cerfa 16216 en pièce jointe.`)}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#166534;">✅ Ce reçu est également disponible dans votre espace Savely.</p>`)}
        ${p('Merci pour votre contribution.')}
      `),
      attachments: [{ filename: 'recu-cerfa-16216.pdf', content: cerfaPdf }],
    });
  }

  async sendDonationFailedEmail(to: string, productSummary: string) {
    await this.send({
      from: config.email.from,
      to,
      subject: "Un don n'a pas trouvé preneur",
      html: emailLayout(`
        ${h1('Don sans preneur')}
        ${p(`Malgré plusieurs propositions, le don (${productSummary}) n'a pas trouvé preneur. L'action est revenue dans votre centre d'actions avec des suggestions alternatives.`)}
      `),
    });
  }

  // ── Cycle de vie commande (click & collect) ───────────────────────────────

  async sendOrderConfirmedEmail(
    to: string,
    pharmacyName: string,
    linesSummary: string
  ): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Votre commande est confirmee',
      html: `
        <p>Bonjour,</p>
        <p>Votre commande chez <strong>${pharmacyName}</strong> est confirmee.</p>
        <p>Details : ${linesSummary}</p>
        <p>Vous serez prevenu(e) des qu'elle sera prete a retirer.</p>
      `,
    });
  }

  async sendOrderReadyEmail(to: string, pharmacyName: string): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Votre commande est prete a retirer',
      html: `
        <p>Bonjour,</p>
        <p>Votre commande chez <strong>${pharmacyName}</strong> est prete.</p>
        <p>Presentez votre QR code au comptoir pour la retirer.</p>
      `,
    });
  }

  async sendOrderCancelledEmail(
    to: string,
    pharmacyName: string,
    reason?: string
  ): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Votre commande a ete annulee',
      html: `
        <p>Bonjour,</p>
        <p>Votre commande chez <strong>${pharmacyName}</strong> a ete annulee${
          reason ? ` : ${reason}` : ''
        }.</p>
      `,
    });
  }

  async sendNewOrderForPrepEmail(
    to: string,
    pharmacyName: string,
    linesSummary: string
  ): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely -- Nouvelle commande a preparer',
      html: `
        <p>Bonjour,</p>
        <p>Une nouvelle commande est a preparer pour <strong>${pharmacyName}</strong>.</p>
        <p>Details : ${linesSummary}</p>
        <p>Rendez-vous dans l'application preparateur pour la traiter.</p>
      `,
    });
  }
}
