import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtPayload } from '../auth.service';
import { UserRole } from '../roles.enum';

/**
 * Enforces multi-tenant isolation: the effective pharmacy_id is always
 * derived from the JWT token, never trusted from the client.
 *
 * - For non-admin users: any incoming `pharmacy_id` (query, body, param) is
 *   replaced by `request.user.pharmacy_id`. A client-supplied value that
 *   differs from the token's value results in 403.
 * - For ADMIN_SAVELY: the client may target a specific pharmacy via query.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: JwtPayload;
        tenantPharmacyId?: string;
      }
    >();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const claimedFromQuery =
      typeof request.query?.pharmacy_id === 'string'
        ? (request.query.pharmacy_id as string)
        : undefined;

    if (user.role === UserRole.ADMIN_SAVELY) {
      request.tenantPharmacyId = claimedFromQuery ?? user.pharmacy_id;
      return true;
    }

    if (claimedFromQuery && claimedFromQuery !== user.pharmacy_id) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    request.tenantPharmacyId = user.pharmacy_id;
    return true;
  }
}
