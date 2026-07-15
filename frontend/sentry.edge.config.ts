/**
 * @author Dev1 — Savely
 * @description Sentry Edge Runtime (middleware Next.js).
 *   Profiling et replay non disponibles dans l'Edge Runtime.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
