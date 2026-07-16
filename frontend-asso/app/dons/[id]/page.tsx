'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Shell from '@/components/shell';
import { type Don, fetchDon } from '@/lib/api';

const ASSO_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export default function DonPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [don, setDon] = useState<Don | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace('/auth/verify');
      return;
    }
    fetchDon(id)
      .then(setDon)
      .catch(() => router.push('/dons'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <Shell>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  if (!don) return null;

  const totalValue = don.lines.reduce(
    (s, l) => s + l.quantity * l.unit_value,
    0
  );

  // L'URL encodée dans le QR correspond au endpoint de scan préparateur.
  const qrValue = `${ASSO_APP_URL}/pickup/${don.qr_code}`;
  // Code court lisible pour saisie manuelle (8 premiers chars de l'UUID)
  const codeDisplay = don.qr_code.replace(/-/g, '').toUpperCase().slice(0, 8);
  const showQr = don.status === 'PLANIFIEE';

  return (
    <Shell>
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Retour
      </button>

      <div className="max-w-2xl space-y-5">
        {/* Infos du don */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Détail du don</h1>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                don.status === 'RETIREE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {don.status === 'RETIREE' ? '✅ Récupéré' : '⏳ En attente de récupération'}
            </span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">
                Officine
              </p>
              <p className="text-gray-900 font-medium">
                {don.donation?.pharmacy?.name ?? '—'}
              </p>
              <p className="text-gray-500">{don.donation?.pharmacy?.address}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Créneau de récupération
              </p>
              <p className="text-gray-900 font-medium">
                {fmt(don.pickup_slot_start)} – {fmt(don.pickup_slot_end)}
              </p>
              {don.picked_up_at && (
                <p className="text-green-700 text-xs mt-0.5">
                  ✅ Récupéré le {fmt(don.picked_up_at)}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Produits
              </p>
              {don.lines.map((l, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span className="text-gray-800">
                    {l.name}{' '}
                    <span className="text-gray-400">× {l.quantity}</span>
                  </span>
                  <span className="text-gray-500">
                    {(l.quantity * l.unit_value).toFixed(2)} €
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-semibold">
                <span>Total HT</span>
                <span className="text-savely-700">
                  {totalValue.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* QR code de récupération */}
        {showQr && (
          <div className="bg-white border border-savely-100 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-1">
              QR code de récupération
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Présentez ce QR code au préparateur lors de la récupération. Il le
              scannera pour confirmer le retrait.
            </p>

            <div className="flex flex-col items-center gap-4">
              {/* Image S3 si dispo en prod, sinon génération client */}
              {don.qr_code_url ? (
                <img
                  src={don.qr_code_url}
                  alt="QR Code de récupération"
                  className="w-48 h-48 rounded-xl border border-gray-100"
                />
              ) : (
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={qrValue}
                    size={176}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              )}

              {/* Code court pour saisie manuelle */}
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Code manuel</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-savely-700 bg-savely-50 px-5 py-2 rounded-xl border border-savely-100">
                  {codeDisplay}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  À saisir par le préparateur si le scan ne fonctionne pas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cerfa */}
        {don.cerfa_url && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-2">
              Reçu fiscal Cerfa disponible
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Réduction fiscale estimée :{' '}
              <strong className="text-savely-700">
                {(totalValue * 0.6).toFixed(2)} €
              </strong>{' '}
              (60 % — art. 238 bis CGI)
            </p>
            <a
              href={don.cerfa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-savely-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-savely-700 transition-colors"
            >
              ⬇ Télécharger le Cerfa PDF
            </a>
          </div>
        )}
      </div>
    </Shell>
  );
}
