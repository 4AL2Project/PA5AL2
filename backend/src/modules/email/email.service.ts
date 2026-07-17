import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

import { config } from '../../core/config';

// ── Template HTML branded Savely ─────────────────────────────────────────────

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Savely</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;" align="center">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#16a34a;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
              <span style="color:#fff;font-size:20px;font-weight:700;line-height:36px;display:block;">S</span>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Savely</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            L'équipe Savely · <a href="https://savely.fr" style="color:#16a34a;text-decoration:none;">savely.fr</a>
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">
            Vous recevez cet email car votre association est partenaire Savely.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr><td style="background:#16a34a;border-radius:8px;">
      <a href="${href}" style="display:inline-block;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${text}</p>`;
}

function small(text: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${text}</p>`;
}

function infoBox(content: string): string {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">${content}</div>`;
}

function warnBox(content: string): string {
  return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">${content}</div>`;
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

  async sendAssociationVerificationEmail(
    to: string,
    name: string,
    link: string
  ): Promise<void> {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Savely — Confirmez votre adresse email',
      html: emailLayout(`
        ${h1(`Bonjour ${name},`)}
        ${p('Merci pour votre inscription sur Savely. Confirmez votre adresse email pour que nous puissions examiner votre demande :')}
        ${btn('Confirmer mon email', link)}
        ${small('Ce lien expire dans 48 heures.')}
      `),
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
      subject: `${pharmacyName} vous propose un don de produits`,
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p(`La pharmacie <strong>${pharmacyName}</strong> souhaite vous donner un lot de produits (parapharmacie / cosmétique).`)}
        ${btn('Voir la proposition de don', link)}
        ${warnBox(`<p style="margin:0;font-size:13px;color:#92400e;">⏰ Sans réponse de votre part avant le ${expiresAt.toLocaleString('fr-FR')}, la proposition sera transmise à une autre association.</p>`)}
        ${small('Cliquez sur le bouton ci-dessus ou copiez ce lien dans votre navigateur : ' + link)}
      `),
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
      subject: 'Rappel — une proposition de don vous attend',
      html: emailLayout(`
        ${h1(`Bonjour ${assoName},`)}
        ${p("Vous n'avez pas encore répondu à la proposition de don en cours.")}
        ${btn('Répondre maintenant', link)}
        ${warnBox(`<p style="margin:0;font-size:13px;color:#92400e;">⏰ Cette proposition expire le ${expiresAt.toLocaleString('fr-FR')}.</p>`)}
      `),
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

  async sendPickupConfirmedEmail(
    to: string,
    assoName: string,
    cerfaPdf: Buffer
  ) {
    await this.send({
      from: config.email.from,
      to,
      subject: 'Retrait confirmé — votre reçu fiscal est joint',
      html: emailLayout(`
        ${h1(`Merci ${assoName} !`)}
        ${p('Le retrait de votre don est confirmé. Vous trouverez le reçu fiscal Cerfa 16216 en pièce jointe.')}
        ${infoBox(`<p style="margin:0;font-size:13px;color:#166534;">✅ Ce reçu ouvre droit à une réduction d'impôt de 60 % du montant du don (art. 238 bis CGI).</p>`)}
        ${p('Conservez ce document 5 ans minimum.')}
      `),
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
