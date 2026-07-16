// Générateur PDF reçu fiscal Cerfa n°16216 (dons des ENTREPRISES, art. 238
// bis CGI) — un reçu par ALLOCATION retirée (les valeurs sont celles des
// lignes de cette allocation uniquement, au coût de revient HT)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface CerfaLine {
  product_name: string;
  lot_number: string | null;
  quantity: number;
  unit_value: number;
}

export interface CerfaData {
  cerfa_number: string;
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_siret: string | null;
  association_name: string;
  association_address: string;
  association_city: string;
  association_postal_code: string;
  lines: CerfaLine[];
  withdrawn_at: Date;
}

/**
 * Génère un Buffer PDF contenant le reçu Cerfa n°16216 pour un don de produits.
 * Retourne une promesse résolue avec le Buffer dès que le stream PDF est finalisé.
 */
export function generateCerfaPdf(data: CerfaData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── En-tête ──────────────────────────────────────────────────────────────
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('REÇU DES DONS ET VERSEMENTS — ENTREPRISE', { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Cerfa n°16216 — (Article 238 bis du Code général des impôts)', {
        align: 'center',
      });

    doc.moveDown();
    doc
      .fontSize(9)
      .text(`Référence Cerfa : ${data.cerfa_number}`, { align: 'right' });

    doc.moveDown();

    // ── Organisme bénéficiaire ────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Organisme bénéficiaire');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom : ${data.association_name}`);
    doc.text(
      `Adresse : ${data.association_address}, ${data.association_postal_code} ${data.association_city}`
    );

    doc.moveDown();

    // ── Donateur ──────────────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Donateur');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Raison sociale : ${data.pharmacy_name}`);
    doc.text(`Adresse : ${data.pharmacy_address}`);
    if (data.pharmacy_siret) {
      doc.text(`SIRET : ${data.pharmacy_siret}`);
    }

    doc.moveDown();

    // ── Nature du don ─────────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Nature du don');
    doc.fontSize(10).font('Helvetica');

    let totalValue = 0;
    for (const line of data.lines) {
      const lineValue = line.quantity * line.unit_value;
      totalValue += lineValue;
      const lot = line.lot_number ? ` (lot ${line.lot_number})` : '';
      doc.text(
        `• ${line.product_name}${lot} — quantité : ${line.quantity} — valeur : ${lineValue.toFixed(2)} €`
      );
    }

    doc.moveDown(0.5);
    doc
      .font('Helvetica-Bold')
      .text(`Valeur totale estimée : ${totalValue.toFixed(2)} €`);
    doc
      .font('Helvetica')
      .text(
        `Date de remise : ${data.withdrawn_at.toLocaleDateString('fr-FR')}`
      );

    doc.moveDown(2);

    // ── Mention légale ────────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(
        "Ce reçu est délivré à l'entreprise donatrice conformément aux dispositions de l'article 238 bis du Code général des impôts " +
          "(réduction d'impôt de 60 % du montant du don, dans la limite de 20 000 € ou de 0,5 % du chiffre d'affaires HT). " +
          'Il doit être conservé 5 ans minimum. ' +
          'Savely — plateforme de gestion de stock dormant pour officines.',
        { align: 'justify' }
      );

    doc.end();
  });
}
