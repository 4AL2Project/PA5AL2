/**
 * EmailService -- envoi d'emails transactionnels via SMTP (nodemailer).
 *
 * Provider choisi : SMTP generique (Mailpit en dev, tout serveur SMTP en prod).
 * Pour utiliser Resend, remplacer le transport par :
 *   createTransport({ host: 'smtp.resend.com', port: 465, auth: { user: 'resend', pass: RESEND_API_KEY } })
 *
 * Variables d'environnement :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import { config } from '../../core/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: config.email.user
      ? { user: config.email.user, pass: config.email.pass }
      : undefined,
  });

  async sendInvitationEmail(to: string, link: string): Promise<void> {
    await this.transporter.sendMail({
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
    this.logger.log(`Invitation email sent to ${to}`);
  }

  async sendMagicLinkEmail(to: string, link: string): Promise<void> {
    await this.transporter.sendMail({
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
    this.logger.log(`Magic link email sent to ${to}`);
  }
}
