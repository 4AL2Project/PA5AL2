/**
 * @author Dev1 — Savely
 * @description Initialisation Sentry — doit être importé en premier dans main.ts,
 *   avant tout autre import NestJS, afin d'instrumenter les modules Node.js natifs.
 */
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN_BACKEND,
  environment: process.env.NODE_ENV ?? 'development',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 1.0,
  // Désactivé si DSN absent (local sans config) — évite les erreurs au démarrage
  enabled: !!process.env.SENTRY_DSN_BACKEND,
});
