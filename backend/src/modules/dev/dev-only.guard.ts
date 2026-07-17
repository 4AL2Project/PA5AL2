import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

import { config } from '../../core/config';

/**
 * Double sécurité : le `DevModule` n'est déjà pas chargé quand les outils de dev
 * sont désactivés (cf. `app.module.ts`), mais si une erreur de config l'y
 * amenait, la route répond 404 — comme si elle n'existait pas.
 */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    if (!config.devToolsEnabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
