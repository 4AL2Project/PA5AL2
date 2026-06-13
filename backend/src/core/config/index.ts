export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  auth: {
    bcryptRounds: 12,
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessTtl: '24h',
    refreshTtl: '7d',
    invitationTtlMs: 48 * 60 * 60 * 1000, // 48h
    magicLinkTtlMs: 15 * 60 * 1000, // 15min
    magicLinkRateLimit: 3, // max requests per window
    magicLinkRateLimitWindowMs: 15 * 60 * 1000, // 15min window
  },
  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@savely.fr',
  },
  frontUrl: process.env.FRONT_URL || 'http://localhost:3000',
};
