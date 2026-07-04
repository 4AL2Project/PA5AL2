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
  private readonly resend = new Resend(config.email.apiKey);
  private smtpTransport: Transporter | null = null;

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
        });
        this.logger.log(
          `Email (SMTP) sent to ${payload.to} (id: ${info.messageId})`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`SMTP error sending to ${payload.to}: ${message}`);
        throw new InternalServerErrorException(
          `Email non envoyé : ${message}`
        );
      }
      return;
    }

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
