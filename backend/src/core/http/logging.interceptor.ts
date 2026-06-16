import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs';

const SWAGGER_PATH_PREFIX = '/api/docs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip: string;
      user?: { sub: string };
    }>();

    const { method, url, ip } = req;

    if (url.startsWith(SWAGGER_PATH_PREFIX)) return next.handle();

    const userId = req.user?.sub ?? 'anon';
    const start = Date.now();

    this.logger.log(`→ ${method} ${url} [ip=${ip}, u=${userId}]`);

    return next.handle().pipe(
      tap(() => {
        const res = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        this.logger.log(
          `← ${method} ${url} ${res.statusCode} [${Date.now() - start}ms]`
        );
      })
    );
  }
}
