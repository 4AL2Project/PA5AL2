/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Wrap with Sentry if @sentry/nextjs is installed.
// Run `pnpm install` after adding "@sentry/nextjs": "^8" to dependencies.
let exportedConfig = nextConfig;
try {
  const { withSentryConfig } = await import('@sentry/nextjs');
  exportedConfig = withSentryConfig(nextConfig, {
    silent: true,
    org: 'savely',
    project: 'frontend-asso',
  });
} catch {
  // @sentry/nextjs not yet installed — skipping Sentry wrapper.
}

export default exportedConfig;
