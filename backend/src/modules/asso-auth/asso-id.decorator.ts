import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { AssoJwtPayload } from './asso-auth.service';

/**
 * Extrait l'`association_id` depuis le payload JWT asso (champ `sub`).
 * À utiliser sur les routes protégées par `JwtAssoGuard`.
 */
export const AssoId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { assoUser?: AssoJwtPayload }>();
    return request.assoUser!.sub;
  }
);
