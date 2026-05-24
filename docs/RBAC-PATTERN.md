# RBAC + Multi-tenant Isolation — Pattern réutilisable (US-04)

Ce document décrit le pattern à suivre pour protéger une route NestJS avec
contrôle de rôle et isolation multi-tenant. Toute nouvelle ressource exposée
côté backend **doit** suivre ce pattern.

## Briques fournies (dans `backend/src/modules/auth/`)

| Brique                     | Fichier                                      | Rôle                                                                           |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| `UserRole`                 | `roles.enum.ts`                              | Énumère `TITULAIRE`, `PREPARATEUR`, `ADMIN_SAVELY`                             |
| `@Roles(...)`              | `decorators/roles.decorator.ts`              | Déclare les rôles autorisés sur la route                                       |
| `@CurrentUser()`           | `decorators/current-user.decorator.ts`       | Injecte le `JwtPayload` du porteur du token                                    |
| `@TenantPharmacyId()`      | `decorators/tenant-pharmacy.decorator.ts`    | Injecte le `pharmacy_id` résolu par `TenantGuard`                              |
| `JwtAuthGuard`             | `guards/jwt-auth.guard.ts`                   | Vérifie le bearer token et hydrate `req.user`                                  |
| `RolesGuard`               | `guards/roles.guard.ts`                      | Refuse 403 si le rôle ne fait pas partie de `@Roles(...)`                      |
| `TenantGuard`              | `guards/tenant.guard.ts`                     | Refuse 403 si le client tente d’accéder à une autre officine                   |
| `MaskFinancialInterceptor` | `interceptors/mask-financial.interceptor.ts` | Masque `cost_price`, `recoverable_value`, `potential_loss`… pour `PREPARATEUR` |

## Règle d’or

> Le `pharmacy_id` effectif est **toujours** dérivé du JWT, jamais d’un
> paramètre client. Côté contrôleur, on utilise `@TenantPharmacyId()`, jamais
> `@Query('pharmacy_id')`.

`TenantGuard` accepte qu’un `?pharmacy_id=` soit présent dans la query **à
condition** qu’il corresponde à celui du token (utile pour des liens partagés).
Toute divergence renvoie `403 Forbidden`. Seul `ADMIN_SAVELY` peut cibler une
autre officine via la query.

## Recette pour protéger une route

```ts
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MaskFinancialInterceptor } from '../auth/interceptors/mask-financial.interceptor';
import { UserRole } from '../auth/roles.enum';

@Controller('api/example')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.ADMIN_SAVELY)
@UseInterceptors(MaskFinancialInterceptor)
export class ExampleController {
  @Get()
  async list(@TenantPharmacyId() pharmacyId: string) {
    return this.repo.findAllForPharmacy(pharmacyId);
  }
}
```

**Important** : l’ordre des guards compte. `JwtAuthGuard` doit s’exécuter
en premier (il pose `req.user`), puis `RolesGuard`, puis `TenantGuard`.

## Cas couverts par les tests (US-04)

- `RolesGuard` : route sans `@Roles` → ouverte ; `PREPARATEUR` sur route
  `TITULAIRE` → 403 ; pas de `req.user` → 403.
- `TenantGuard` : token absent → 403 ; query absente → fallback token ;
  query = token → OK ; query ≠ token (non-admin) → 403 ; admin → peut
  cibler n’importe quelle officine.
- `MaskFinancialInterceptor` : `TITULAIRE`/`ADMIN_SAVELY` voient `cost_price`,
  `recoverable_value`, `potential_loss`, `total_recoverable`,
  `total_potential_loss` ; `PREPARATEUR` voit tout sauf ces champs.

## Comment ajouter une route administrateur

```ts
@Get('all-pharmacies')
@Roles(UserRole.ADMIN_SAVELY)
async listAll() { ... }
```

Les décorateurs `@Roles(...)` posés sur une méthode **surchargent** ceux de
la classe (via `Reflector.getAllAndOverride`).

## Endpoints actuellement protégés

- `GET /api/dashboard` — `TITULAIRE`, `PREPARATEUR`, `ADMIN_SAVELY`
- `GET /api/products` — idem (financier masqué pour `PREPARATEUR`)
- `GET /api/products/:product_id` — idem ; renvoie 404 si le produit
  appartient à une autre officine.
- `GET /api/analysis/latest` — idem

## Migration de schéma

`User.role` (string, default `TITULAIRE`) a été ajouté au schéma Prisma. Pour
appliquer :

```bash
cd backend
npx prisma migrate dev --schema src/database/prisma/schema.prisma --name add_user_role
```

## Tests

```bash
cd backend
npm test
```
