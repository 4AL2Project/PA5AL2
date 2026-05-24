import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { UserRole } from '../roles.enum';
import { MaskFinancialInterceptor } from './mask-financial.interceptor';

function makeContext(role?: UserRole): ExecutionContext {
  const req = { user: role ? { role } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function handlerOf(payload: unknown): CallHandler {
  return { handle: () => of(payload) };
}

describe('MaskFinancialInterceptor', () => {
  const interceptor = new MaskFinancialInterceptor();

  const sampleProductPayload = {
    products: [
      {
        product_id: 'p-1',
        name: 'Doliprane 1000mg',
        unit_price: 4.5,
        cost_price: 2.1,
        recoverable_value: 12,
        potential_loss: 30,
        risk_level: 'critical',
      },
    ],
    total: 1,
  };

  const sampleDashboardPayload = {
    pharmacy: { name: 'Officine A' },
    summary: {
      total_products: 10,
      total_recoverable: 120,
      total_potential_loss: 300,
      by_risk_level: { critical: 2, high: 3, safe: 5 },
    },
  };

  it('laisse passer la réponse intacte pour un TITULAIRE', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext(UserRole.TITULAIRE),
        handlerOf(sampleProductPayload)
      )
    );
    expect(result).toEqual(sampleProductPayload);
  });

  it('laisse passer la réponse intacte pour un ADMIN_SAVELY', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext(UserRole.ADMIN_SAVELY),
        handlerOf(sampleDashboardPayload)
      )
    );
    expect(result).toEqual(sampleDashboardPayload);
  });

  it('masque cost_price, recoverable_value et potential_loss pour un PREPARATEUR (produits)', async () => {
    const result = (await lastValueFrom(
      interceptor.intercept(
        makeContext(UserRole.PREPARATEUR),
        handlerOf(sampleProductPayload)
      )
    )) as typeof sampleProductPayload;

    expect(result.products[0]).not.toHaveProperty('cost_price');
    expect(result.products[0]).not.toHaveProperty('recoverable_value');
    expect(result.products[0]).not.toHaveProperty('potential_loss');
    expect(result.products[0]).toHaveProperty('unit_price', 4.5);
    expect(result.products[0]).toHaveProperty('name', 'Doliprane 1000mg');
  });

  it('masque total_recoverable et total_potential_loss du dashboard pour un PREPARATEUR', async () => {
    const result = (await lastValueFrom(
      interceptor.intercept(
        makeContext(UserRole.PREPARATEUR),
        handlerOf(sampleDashboardPayload)
      )
    )) as { summary: Record<string, unknown> };

    expect(result.summary).not.toHaveProperty('total_recoverable');
    expect(result.summary).not.toHaveProperty('total_potential_loss');
    expect(result.summary).toHaveProperty('total_products', 10);
    expect(result.summary).toHaveProperty('by_risk_level');
  });

  it('n’altère pas les valeurs primitives ni les tableaux non-objets', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext(UserRole.PREPARATEUR),
        handlerOf([1, 2, 'doliprane'])
      )
    );
    expect(result).toEqual([1, 2, 'doliprane']);
  });
});
