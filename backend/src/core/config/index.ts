// Rôle du process. Une même image se déploie en plusieurs services de conteneurs
// qui se distinguent par `ROLE` (aucune dépendance à un cron/scheduler managé) :
//   'api'       → HTTP + WebSocket, enfile les jobs mais ne les traite pas
//   'worker'    → consomme les files BullMQ (ingestion + tâches planifiées)
//   'scheduler' → fait tourner les @Cron (singleton) qui enfilent les tâches
//   'all'       → tout dans un seul process (défaut : dev local, mono-service)
export type AppRole = 'api' | 'worker' | 'scheduler' | 'all';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  role: (process.env.ROLE || 'all') as AppRole,
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
    // OTP de connexion Préparateur (back-office) — remplace le mot de passe
    preparateurOtpLength: 6, // nombre de chiffres du code
    preparateurOtpTtlMs: 10 * 60 * 1000, // 10min de validité
    preparateurOtpMaxAttempts: 5, // essais de vérification avant invalidation
    preparateurOtpRateLimit: 3, // max de codes demandés par fenêtre
    preparateurOtpRateLimitWindowMs: 15 * 60 * 1000, // 15min window
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
  // Secret partageant l'accès à l'endpoint de déclenchement des tâches planifiées
  // (`POST /internal/scheduler/*`). En prod, un scheduler tiers (Cloud Scheduler…)
  // envoie ce secret dans l'en-tête `X-Scheduler-Key` pour enfiler une tâche.
  schedulerSecret: process.env.SCHEDULER_SECRET || '',
  // Stockage des fichiers uploadés (images d'offres, logos d'associations,
  // fichiers d'import). `driver` = 's3' pour AWS S3 + CloudFront, 'local' pour
  // le disque local (dev/test). Bascule automatiquement sur 's3' si un bucket
  // est configuré, sinon reste en 'local' pour garder le dev sans AWS.
  storage: {
    driver: (process.env.STORAGE_DRIVER ||
      (process.env.AWS_S3_BUCKET ? 's3' : 'local')) as 's3' | 'local',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_REGION || 'eu-west-3',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      // Optionnel : endpoint custom (MinIO / LocalStack) et path-style.
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    },
    // Domaine CloudFront servant les fichiers du bucket (sans slash final).
    // Ex: https://d1234abcd.cloudfront.net
    cloudFrontUrl: (process.env.CLOUDFRONT_URL || '').replace(/\/+$/, ''),
    // Préfixes de clés (dossiers logiques) par type d'asset.
    prefixes: {
      offers: 'offers',
      associations: 'associations',
      imports: 'imports',
    },
  },
};

// Helpers de rôle : un provider « actif » (worker processor, cron producer) n'est
// instancié que pour son rôle, ou en mode 'all' (dev local / mono-service).
export const isApi = config.role === 'api' || config.role === 'all';
export const isWorker = config.role === 'worker' || config.role === 'all';
export const isScheduler = config.role === 'scheduler' || config.role === 'all';
