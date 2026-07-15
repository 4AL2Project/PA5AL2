/**
 * @author Dev1 — Savely
 * @description Sentry client-side — capturé dans le navigateur (React errors,
 *   unhandled rejections) avec Session Replay RGPD-compliant.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,   // RGPD — masque toutes les données texte des replays
      blockAllMedia: true, // RGPD — bloque les médias (ordonnances, logos)
    }),
  ],
  // Ne rien envoyer si le DSN est absent (développement local sans config)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
