import { mkdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

// Racine physique des fichiers uploadés (images d'offres, etc.).
// Servie statiquement sous le préfixe HTTP `/uploads/` (voir main.ts).
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const OFFER_IMAGES_DIR = join(UPLOADS_ROOT, 'offers');
export const ASSOCIATION_LOGOS_DIR = join(UPLOADS_ROOT, 'associations');

// Préfixe HTTP public correspondant à UPLOADS_ROOT.
export const UPLOADS_PUBLIC_PREFIX = '/uploads';

// Crée le dossier des images d'offres si nécessaire (idempotent).
export function ensureOfferImagesDir(): void {
  mkdirSync(OFFER_IMAGES_DIR, { recursive: true });
}

// Crée le dossier des logos d'associations si nécessaire (idempotent).
export function ensureAssociationLogosDir(): void {
  mkdirSync(ASSOCIATION_LOGOS_DIR, { recursive: true });
}

// URL publique (relative) d'une image d'offre à partir de son nom de fichier.
export function offerImagePublicUrl(filename: string): string {
  return `${UPLOADS_PUBLIC_PREFIX}/offers/${filename}`;
}

// URL publique (relative) d'un logo d'association à partir de son nom de fichier.
export function associationLogoPublicUrl(filename: string): string {
  return `${UPLOADS_PUBLIC_PREFIX}/associations/${filename}`;
}

// Supprime du disque le fichier d'une image d'offre à partir de son URL
// publique (best-effort — n'échoue jamais si le fichier est déjà absent).
export function deleteUploadByUrl(url: string): void {
  if (!url.startsWith(`${UPLOADS_PUBLIC_PREFIX}/offers/`)) return;
  rmSync(join(OFFER_IMAGES_DIR, basename(url)), { force: true });
}
