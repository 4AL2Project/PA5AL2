import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { ImportFileType } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Libellé lisible du type de fichier d'un import (produits, ventes ou les deux). */
export function importFileTypeLabel(type: ImportFileType | string): string {
  switch (type) {
    case 'products':
      return 'Produits';
    case 'sales':
      return 'Ventes';
    case 'products+sales':
      return 'Produits + Ventes';
    default:
      return type;
  }
}
