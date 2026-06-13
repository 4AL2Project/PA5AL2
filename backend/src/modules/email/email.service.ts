// Roger — v1.0
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Resend } from 'resend';

import { config } from '../../core/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = new Resend(config.email.apiKey);

  private async send(
    payload: Parameters<Resend['emails']['send']>[0]
  ): Promise<void> {
    const { data, error } = await this.resend.emails.send(payload);
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
}
