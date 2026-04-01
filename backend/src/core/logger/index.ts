import { Logger } from '@nestjs/common';

export class AppLogger extends Logger {
  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
  }

  log(message: string, context?: string) {
    super.log(message, context);
  }
}

export const logger = new AppLogger('App');
