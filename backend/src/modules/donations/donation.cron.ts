import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    const expired = await this.orchestrator.expireOverdueProposals();
    const reminded = await this.orchestrator.sendResponseReminders();
    const pickupReminders = await this.orchestrator.sendPickupReminders();
    const missed = await this.orchestrator.handleMissedPickups();
    if (expired + reminded + pickupReminders + missed > 0) {
      this.logger.log(
        `Donation tick: ${expired} expirée(s), ${reminded} relance(s), ` +
          `${pickupReminders} rappel(s) retrait, ${missed} retrait(s) manqué(s)`
      );
    }
  }
}
