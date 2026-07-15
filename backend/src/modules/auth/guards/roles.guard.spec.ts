import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../roles.enum';
import { RolesGuard } from './roles.guard';

function makeContext(user?: { role?: string }): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => null,
    getClass: () => null,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('autorise quand aucun rôle requis n’est déclaré sur la route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: UserRole.PREPARATEUR }))).toBe(
      true
    );
  });

  it('autorise un TITULAIRE sur une route réservée aux TITULAIRE', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.TITULAIRE]);
    expect(guard.canActivate(makeContext({ role: UserRole.TITULAIRE }))).toBe(
      true
    );
  });

  it('refuse un PREPARATEUR sur une route réservée aux TITULAIRE', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.TITULAIRE]);
    expect(() =>
      guard.canActivate(makeContext({ role: UserRole.PREPARATEUR }))
    ).toThrow(ForbiddenException);
  });

  it('refuse une requête sans utilisateur authentifié', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.TITULAIRE]);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException
    );
  });

  it('autorise un ADMIN_SAVELY sur une route ouverte aux admins', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN_SAVELY]);
    expect(
      guard.canActivate(makeContext({ role: UserRole.ADMIN_SAVELY }))
    ).toBe(true);
  });

  it('utilise l’override de méthode au-dessus de la classe (Reflector.getAllAndOverride)', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.TITULAIRE]);
    guard.canActivate(makeContext({ role: UserRole.TITULAIRE }));
    expect(spy).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
