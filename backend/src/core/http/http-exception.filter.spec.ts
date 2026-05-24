import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

type CapturedResponse = {
  statusCode: number;
  body: unknown;
};

function makeHost(): { host: ArgumentsHost; captured: CapturedResponse } {
  const captured: CapturedResponse = { statusCode: 0, body: undefined };
  const res = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  };
  const req = { url: '/api/test', method: 'GET' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;
  return { host, captured };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('transforme une BadRequestException en enveloppe error avec code BAD_REQUEST', () => {
    const { host, captured } = makeHost();
    filter.catch(new BadRequestException('email invalide'), host);

    expect(captured.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(captured.body).toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'email invalide' },
    });
  });

  it('transforme une NotFoundException en enveloppe error 404', () => {
    const { host, captured } = makeHost();
    filter.catch(new NotFoundException('Product not found'), host);

    expect(captured.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(captured.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  });

  it('transforme une UnauthorizedException en enveloppe error 401', () => {
    const { host, captured } = makeHost();
    filter.catch(new UnauthorizedException(), host);

    expect(captured.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(captured.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('expose les détails de validation class-validator dans error.details', () => {
    const { host, captured } = makeHost();
    const validationException = new HttpException(
      {
        statusCode: 400,
        message: ['email must be an email', 'password too short'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST
    );
    filter.catch(validationException, host);

    const body = captured.body as {
      success: boolean;
      error: { code: string; message: string; details?: unknown };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.details).toEqual([
      'email must be an email',
      'password too short',
    ]);
  });

  it('transforme une erreur non-HttpException en 500 INTERNAL_ERROR sans fuiter la stack', () => {
    const { host, captured } = makeHost();
    filter.catch(new Error('db connection lost'), host);

    expect(captured.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = captured.body as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('db connection lost');
  });
});
