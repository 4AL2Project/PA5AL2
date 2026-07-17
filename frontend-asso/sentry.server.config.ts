// Sentry server-side initialization.
// Requires @sentry/nextjs — run `pnpm install` after adding the dependency.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
