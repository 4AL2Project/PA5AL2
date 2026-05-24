import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { ErrorResponse } from './response.types';

const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => ResponseLike;
};

type RequestLike = { url?: string; method?: string };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();
    const request = ctx.getRequest<RequestLike>();

    const { status, message, code, details } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    const body: ErrorResponse = {
      success: false,
      error:
        details !== undefined ? { code, message, details } : { code, message },
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const code = STATUS_CODE_MAP[status] ?? `HTTP_${status}`;

      if (typeof raw === 'string') {
        return { status, code, message: raw };
      }

      const payload = raw as {
        message?: string | string[];
        error?: string;
      };
      const isValidationArray = Array.isArray(payload.message);
      const message = isValidationArray
        ? (payload.error ?? 'Validation failed')
        : (payload.message ?? exception.message);
      const details = isValidationArray ? payload.message : undefined;

      return {
        status,
        code,
        message: String(message),
        ...(details !== undefined ? { details } : {}),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }
}
