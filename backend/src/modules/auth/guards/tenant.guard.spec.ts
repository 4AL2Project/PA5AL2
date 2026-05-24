import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { UserRole } from '../roles.enum';
import { TenantGuard } from './tenant.guard';

type FakeReq = {
  user?: { pharmacy_id: string; role: UserRole };
  query?: Record<string, string | undefined>;
  tenantPharmacyId?: string;
};

function makeContext(req: FakeReq): {
  context: ExecutionContext;
  req: FakeReq;
} {
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('TenantGuard', () => {
  const guard = new TenantGuard();
  const PHARMACY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const PHARMACY_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  it('refuse une requête sans utilisateur', () => {
    const { context } = makeContext({});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('dérive le pharmacy_id du token et ignore l’absence de query', () => {
    const { context, req } = makeContext({
      user: { pharmacy_id: PHARMACY_A, role: UserRole.TITULAIRE },
    });
    expect(guard.canActivate(context)).toBe(true);
    expect(req.tenantPharmacyId).toBe(PHARMACY_A);
  });

  it('autorise quand le client envoie son propre pharmacy_id (cohérent avec le token)', () => {
    const { context, req } = makeContext({
      user: { pharmacy_id: PHARMACY_A, role: UserRole.TITULAIRE },
      query: { pharmacy_id: PHARMACY_A },
    });
    expect(guard.canActivate(context)).toBe(true);
    expect(req.tenantPharmacyId).toBe(PHARMACY_A);
  });

  it('refuse 403 quand un titulaire de l’officine A demande l’officine B', () => {
    const { context } = makeContext({
      user: { pharmacy_id: PHARMACY_A, role: UserRole.TITULAIRE },
      query: { pharmacy_id: PHARMACY_B },
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('refuse 403 quand un préparateur tente une bascule de tenant', () => {
    const { context } = makeContext({
      user: { pharmacy_id: PHARMACY_A, role: UserRole.PREPARATEUR },
      query: { pharmacy_id: PHARMACY_B },
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('un ADMIN_SAVELY peut cibler n’importe quelle officine via query', () => {
    const { context, req } = makeContext({
      user: { pharmacy_id: PHARMACY_A, role: UserRole.ADMIN_SAVELY },
      query: { pharmacy_id: PHARMACY_B },
    });
    expect(guard.canActivate(context)).toBe(true);
    expect(req.tenantPharmacyId).toBe(PHARMACY_B);
  });

  it('un ADMIN_SAVELY sans query retombe sur son propre pharmacy_id', () => {
    const { context, req } = makeContext({
      user: { pharmacy_id: PHARMACY_A, role: UserRole.ADMIN_SAVELY },
    });
    expect(guard.canActivate(context)).toBe(true);
    expect(req.tenantPharmacyId).toBe(PHARMACY_A);
  });
});
