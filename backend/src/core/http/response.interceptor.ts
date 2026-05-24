import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

import { SuccessResponse } from './response.types';

const SWAGGER_PATH_PREFIX = '/api/docs';

function isAlreadyEnveloped(value: unknown): value is SuccessResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success: unknown }).success === true &&
    'data' in value
  );
}

@Injectable()
export class ResponseEnvelopeInterceptor
  implements NestInterceptor<unknown, unknown>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url?: string }>();
    const url = request?.url ?? '';

    return next.handle().pipe(
      map((data) => {
        if (url.startsWith(SWAGGER_PATH_PREFIX)) return data;
        if (isAlreadyEnveloped(data)) return data;
        return { success: true, data } satisfies SuccessResponse<unknown>;
      })
    );
  }
}
