import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { config } from '../../core/config';

const HEADER = 'x-scheduler-key';

/**
 * Protège l'endpoint de déclenchement des tâches planifiées : n'autorise que les
 * requêtes portant l'en-tête `X-Scheduler-Key` égal à `SCHEDULER_SECRET`.
 * Fail-closed : si le secret n'est pas configuré, l'endpoint est refusé.
 */
@Injectable()
export class SchedulerKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = config.schedulerSecret;
    if (!secret) {
      throw new UnauthorizedException(
        'Scheduler endpoint disabled (no secret)'
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header(HEADER);
    if (provided !== secret) {
      throw new UnauthorizedException('Invalid scheduler key');
    }
    return true;
  }
}
