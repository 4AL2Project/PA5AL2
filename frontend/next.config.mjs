import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: 'savely',
  project: 'savely-frontend',
  // Silence Sentry CLI output pendant le build (visible uniquement si erreur)
  silent: true,
  // Upload les source maps des composants client (meilleur stack trace)
  widenClientFileUpload: true,
  // Ne pas exposer les source maps dans le bundle public
  hideSourceMaps: true,
  // Supprime les logs Sentry SDK dans la console navigateur
  disableLogger: true,
});
