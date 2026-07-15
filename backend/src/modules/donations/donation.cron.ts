import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/node';

import { DonationOrchestratorService } from './donation-orchestrator.service';

// Boucle horaire du cycle don : expiration des propositions sans réponse,
// relances mi-délai, rappels de retrait J-3/J-1, retraits manqués.
// Chaque traitement est idempotent (updateMany conditionnel + DonationEmailLog).
@Injectable()
export class DonationCron {
  private readonly logger = new Logger(DonationCron.name);

  constructor(private readonly orchestrator: DonationOrchestratorService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick() {
    let expired = 0;
    let reminded = 0;
    let pickupReminders = 0;
    let missed = 0;
    const errors: string[] = [];

    try {
      expired = await this.orchestrator.expireOverdueProposals();
      reminded = await this.orchestrator.sendResponseReminders();
      pickupReminders = await this.orchestrator.sendPickupReminders();
      missed = await this.orchestrator.handleMissedPickups();
    } catch (err) {
      // Le cron tourne à 02h00 — une erreur ici passe silencieusement sans monitoring
      errors.push(String(err));
      Sentry.captureException(err, {
        tags: { module: 'cron', action: 'relance-delais' },
        extra: {
          nbDonsTraites: expired + reminded + pickupReminders + missed,
          nbErreurs: 1,
          errors,
        },
      });
      this.logger.error('Donation cron tick failed', err);
    }

    if (expired + reminded + pickupReminders + missed > 0) {
      this.logger.log(
        `Donation tick: ${expired} expirée(s), ${reminded} relance(s), ` +
          `${pickupReminders} rappel(s) retrait, ${missed} retrait(s) manqué(s)`
      );
    }
  }
}
