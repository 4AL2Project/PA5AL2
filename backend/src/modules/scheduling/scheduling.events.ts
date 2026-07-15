// File des tâches planifiées (maintenance). Le service `scheduler` y enfile des
// jobs via @Cron ; le service `worker` les consomme. Aucun cron managé externe.
export const MAINTENANCE_QUEUE = 'maintenance' as const;

// Noms de jobs de la file `maintenance`.
export const DAILY_ANALYSIS_JOB = 'daily-analysis' as const;
export const EXPIRE_ORDERS_JOB = 'expire-orders' as const;

export type MaintenanceJob =
  | typeof DAILY_ANALYSIS_JOB
  | typeof EXPIRE_ORDERS_JOB;
