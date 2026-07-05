export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  auth: {
    bcryptRounds: 12,
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    customerSecret:
      process.env.JWT_CUSTOMER_SECRET || 'dev-customer-secret-change-me',
    accessTtl: '24h',
    refreshTtl: '7d',
    invitationTtlMs: 48 * 60 * 60 * 1000, // 48h
    magicLinkTtlMs: 15 * 60 * 1000, // 15min
    magicLinkRateLimit: 3, // max requests per window
    magicLinkRateLimitWindowMs: 15 * 60 * 1000, // 15min window
    // OTP de connexion Customer B2C (app mobile)
    customerOtpLength: 6, // nombre de chiffres du code
    customerOtpTtlMs: 10 * 60 * 1000, // 10min de validité
    customerOtpMaxAttempts: 5, // essais de vérification avant invalidation
    customerOtpRateLimit: 3, // max de codes demandés par fenêtre
    customerOtpRateLimitWindowMs: 15 * 60 * 1000, // 15min window
  },
  email: {
    // 'resend' (prod) ou 'smtp' (dev/test via MailHog)
    transport: (process.env.EMAIL_TRANSPORT || 'resend') as 'resend' | 'smtp',
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@savely.fr',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
    },
  },
  frontUrl: process.env.FRONT_URL || 'http://localhost:3000',
};
