/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Exception domaine — format CSV LGO non reconnu
 */

export class FormatCSVInconnuException extends Error {
  constructor(colonnes: string[]) {
    super(
      `Format CSV inconnu. Colonnes détectées : [${colonnes.join(', ')}]. ` +
        `Formats supportés : Winpharma, LGPI, Smart RX.`,
    );
    this.name = 'FormatCSVInconnuException';
    Object.setPrototypeOf(this, FormatCSVInconnuException.prototype);
  }
}
