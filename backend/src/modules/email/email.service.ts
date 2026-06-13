// Roger — v1.0
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import { config } from '../../core/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = new Resend(config.email.apiKey);

  async sendInvitationEmail(to: string, link: string): Promise<void> {
    await this.resend.emails.send({
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
    await this.resend.emails.send({
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
