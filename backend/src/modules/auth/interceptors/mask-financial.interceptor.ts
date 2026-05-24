import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { JwtPayload } from '../auth.service';
import { FINANCIAL_FIELDS, UserRole } from '../roles.enum';

const FIELDS_TO_MASK = new Set<string>(FINANCIAL_FIELDS);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => !FIELDS_TO_MASK.has(k)
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, strip(v)])) as Record<
      string,
      unknown
    >;
  }
  return value;
}

/**
 * Removes financial fields (cost_price, recoverable_value, potential_loss…)
 * from the response payload when the requester is a PREPARATEUR.
 * Other roles (TITULAIRE, ADMIN_SAVELY) see the full data.
 */
@Injectable()
export class MaskFinancialInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const role = request.user?.role;

    if (role !== UserRole.PREPARATEUR) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => strip(data)));
  }
}
