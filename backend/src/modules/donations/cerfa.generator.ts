// Roger — v1.0
// Générateur PDF reçu Cerfa n°11580*03 — US-32
import PDFDocument from 'pdfkit';

export interface CerfaData {
  cerfa_number: string;
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_siret: string | null;
  association_name: string;
  association_address: string;
  association_city: string;
  association_postal_code: string;
  product_name: string;
  lot_number: string | null;
  quantity: number;
  estimated_value: number;
  withdrawn_at: Date;
}

/**
 * Génère un Buffer PDF contenant le reçu Cerfa n°11580*03 pour un don de produits.
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
      .text('REÇU DU DON EN NATURE', { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('(Article 200 et 238 bis du Code général des impôts)', {
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
    doc.text(`Produit : ${data.product_name}`);
    if (data.lot_number) {
      doc.text(`Numéro de lot : ${data.lot_number}`);
    }
    doc.text(`Quantité donnée : ${data.quantity}`);
    doc.text(`Valeur estimée : ${data.estimated_value.toFixed(2)} €`);
    doc.text(
      `Date de remise : ${data.withdrawn_at.toLocaleDateString('fr-FR')}`
    );

    doc.moveDown(2);

    // ── Mention légale ────────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(
        "Ce reçu est délivré au donateur conformément aux dispositions de l'article 200 du Code général des impôts. " +
          'Il doit être conservé 5 ans minimum. ' +
          'Savely — plateforme de gestion de stock dormant pour officines.',
        { align: 'justify' }
      );

    doc.end();
  });
}
