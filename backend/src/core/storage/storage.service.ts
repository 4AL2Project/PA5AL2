import { mkdirSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

import { config } from '../config';
import { UPLOADS_PUBLIC_PREFIX, UPLOADS_ROOT } from '../uploads';

/** Paramètres d'un upload : clé (chemin logique), contenu et type MIME. */
export interface UploadParams {
  /** Clé objet, ex. `offers/uuid.jpg` (sans slash initial). */
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Abstraction de stockage des fichiers uploadés (images d'offres, logos
 * d'associations, fichiers d'import). Deux implémentations sélectionnées via
 * `config.storage.driver` :
 *  - `s3`    : AWS S3 pour le stockage + CloudFront pour la diffusion publique.
 *  - `local` : disque local servi statiquement sous `/uploads/` (dev/test).
 *
 * `upload()` renvoie l'URL publique à persister (CloudFront en prod, chemin
 * relatif `/uploads/...` en local — les deux sont gérés côté front/mobile).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver = config.storage.driver;
  private readonly s3?: S3Client;

  constructor() {
    if (this.driver === 's3') {
      const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } =
        config.storage.s3;
      this.s3 = new S3Client({
        region,
        endpoint,
        forcePathStyle,
        // Si les clés ne sont pas fournies, on laisse le SDK résoudre les
        // credentials via la chaîne AWS par défaut (rôle IAM, profil, etc.).
        credentials:
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined,
      });
      this.logger.log(
        `Storage driver=s3 bucket=${config.storage.s3.bucket} region=${region}`
      );
    } else {
      this.logger.log('Storage driver=local (uploads served under /uploads/)');
    }
  }

  /** Envoie un objet et renvoie son URL publique à persister. */
  async upload({ key, body, contentType }: UploadParams): Promise<string> {
    const normalizedKey = key.replace(/^\/+/, '');
    if (this.driver === 's3') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: config.storage.s3.bucket,
          Key: normalizedKey,
          Body: body,
          ContentType: contentType,
        })
      );
    } else {
      const dest = join(UPLOADS_ROOT, normalizedKey);
      mkdirSync(dirname(dest), { recursive: true });
      await writeFile(dest, body);
    }
    return this.publicUrl(normalizedKey);
  }

  /** Récupère le contenu d'un objet (utile pour rejouer un fichier d'import). */
  async getObject(keyOrUrl: string): Promise<Buffer> {
    const key = this.keyFromUrl(keyOrUrl) ?? keyOrUrl.replace(/^\/+/, '');
    if (this.driver === 's3') {
      const res = await this.s3!.send(
        new GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: key })
      );
      const bytes = await res.Body!.transformToByteArray();
      return Buffer.from(bytes);
    }
    return readFile(join(UPLOADS_ROOT, key));
  }

  /**
   * Supprime un objet à partir de son URL publique ou de sa clé (best-effort :
   * n'échoue jamais si le fichier est déjà absent).
   */
  async delete(keyOrUrl: string): Promise<void> {
    const key = this.keyFromUrl(keyOrUrl) ?? keyOrUrl.replace(/^\/+/, '');
    if (!key) return;
    try {
      if (this.driver === 's3') {
        await this.s3!.send(
          new DeleteObjectCommand({
            Bucket: config.storage.s3.bucket,
            Key: key,
          })
        );
      } else {
        rmSync(join(UPLOADS_ROOT, key), { force: true });
      }
    } catch (err) {
      this.logger.warn(`Failed to delete storage object ${key}: ${err}`);
    }
  }

  /** URL publique d'une clé (CloudFront en s3, chemin relatif en local). */
  publicUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '');
    if (this.driver === 's3') {
      const base =
        config.storage.cloudFrontUrl ||
        `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com`;
      return `${base}/${normalizedKey}`;
    }
    return `${UPLOADS_PUBLIC_PREFIX}/${normalizedKey}`;
  }

  /** Extrait la clé objet d'une URL publique connue, sinon `null`. */
  keyFromUrl(url: string): string | null {
    if (!url) return null;
    const cloudFront = config.storage.cloudFrontUrl;
    if (cloudFront && url.startsWith(`${cloudFront}/`)) {
      return url.slice(cloudFront.length + 1);
    }
    const s3Host = `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/`;
    if (config.storage.s3.bucket && url.startsWith(s3Host)) {
      return url.slice(s3Host.length);
    }
    if (url.startsWith(`${UPLOADS_PUBLIC_PREFIX}/`)) {
      return url.slice(UPLOADS_PUBLIC_PREFIX.length + 1);
    }
    return null;
  }
}
