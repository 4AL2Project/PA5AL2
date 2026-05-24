import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { ResponseEnvelopeInterceptor } from './response.interceptor';

function makeContext(path = '/api/test'): ExecutionContext {
  const req = { url: path };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function handlerOf(payload: unknown): CallHandler {
  return { handle: () => of(payload) };
}

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();

  it('emballe un objet de données dans une enveloppe success=true', async () => {
    const payload = { name: 'Doliprane', stock: 12 };
    const result = await lastValueFrom(
      interceptor.intercept(makeContext(), handlerOf(payload))
    );
    expect(result).toEqual({ success: true, data: payload });
  });

  it('emballe un tableau dans une enveloppe success=true', async () => {
    const payload = [{ id: 'p-1' }, { id: 'p-2' }];
    const result = await lastValueFrom(
      interceptor.intercept(makeContext(), handlerOf(payload))
    );
    expect(result).toEqual({ success: true, data: payload });
  });

  it('emballe une valeur primitive dans une enveloppe success=true', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(makeContext(), handlerOf('ok'))
    );
    expect(result).toEqual({ success: true, data: 'ok' });
  });

  it("n'enveloppe pas une réponse déjà au format enveloppe", async () => {
    const alreadyEnveloped = { success: true, data: { foo: 'bar' } };
    const result = await lastValueFrom(
      interceptor.intercept(makeContext(), handlerOf(alreadyEnveloped))
    );
    expect(result).toEqual(alreadyEnveloped);
  });

  it("n'enveloppe pas les routes Swagger (/api/docs)", async () => {
    const swaggerPayload = { openapi: '3.0.0', info: {} };
    const result = await lastValueFrom(
      interceptor.intercept(
        makeContext('/api/docs-json'),
        handlerOf(swaggerPayload)
      )
    );
    expect(result).toEqual(swaggerPayload);
  });
});
