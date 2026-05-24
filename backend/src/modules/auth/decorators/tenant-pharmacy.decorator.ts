import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Returns the pharmacy_id resolved by TenantGuard (derived from the JWT,
 * never trusted from the client). Use this in controllers instead of
 * `@Query('pharmacy_id')`.
 */
export const TenantPharmacyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { tenantPharmacyId?: string }>();
    return request.tenantPharmacyId;
  }
);
