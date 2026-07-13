import { join } from 'node:path';

// Racine physique des fichiers uploadés en mode stockage `local`
// (images d'offres, logos d'associations, fichiers d'import). Servie
// statiquement sous le préfixe HTTP `/uploads/` (voir main.ts). En mode `s3`,
// ces fichiers vivent dans le bucket S3 et sont diffusés via CloudFront.
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

// Préfixe HTTP public correspondant à UPLOADS_ROOT (driver `local`).
export const UPLOADS_PUBLIC_PREFIX = '/uploads';
