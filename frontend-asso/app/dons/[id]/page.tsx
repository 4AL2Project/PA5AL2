'use client';
import { ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssoLayout } from '@/components/asso-layout';
import { type Don, fetchDon } from '@/lib/api';

const ASSO_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

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
      router.replace('/auth/login');
      return;
    }
    fetchDon(id)
      .then(setDon)
      .catch(() => router.push('/dons'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const breadcrumb = (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Retour aux dons
    </button>
  );

  if (loading)
    return (
      <AssoLayout title="Détail du don" breadcrumb={breadcrumb}>
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AssoLayout>
    );
  if (!don) return null;

  const totalValue = don.lines.reduce(
    (s, l) => s + l.quantity * l.unit_value,
    0
  );

  const qrValue = `${ASSO_APP_URL}/pickup/${don.qr_code}`;
  const codeDisplay = don.qr_code.replace(/-/g, '').toUpperCase().slice(0, 8);
  const showQr = don.status === 'PLANIFIEE';

  return (
    <AssoLayout
      title="Détail du don"
      breadcrumb={breadcrumb}
      actions={
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            don.status === 'RETIREE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {don.status === 'RETIREE' ? 'Récupéré' : 'En attente de récupération'}
        </span>
      }
    >
      <div className="max-w-2xl space-y-4">
        {/* Infos du don */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase text-muted-foreground">
                Officine
              </p>
              <p className="font-medium text-foreground">
                {don.donation?.pharmacy?.name ?? '—'}
              </p>
              {don.donation?.pharmacy?.address && (
                <p className="text-muted-foreground">
                  {don.donation.pharmacy.address}
                </p>
              )}
            </div>

            <div>
              <p className="mb-0.5 text-xs font-medium uppercase text-muted-foreground">
                Créneau de récupération
              </p>
              <p className="font-medium text-foreground">
                {fmt(don.pickup_slot_start)} – {fmt(don.pickup_slot_end)}
              </p>
              {don.picked_up_at && (
                <p className="mt-0.5 text-xs text-emerald-700">
                  ✅ Récupéré le {fmt(don.picked_up_at)}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Produits
              </p>
              {don.lines.map((l, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-foreground">
                    {l.name}{' '}
                    <span className="text-muted-foreground">
                      × {l.quantity}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {(l.quantity * l.unit_value).toFixed(2)} €
                  </span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total HT</span>
                <span className="text-primary">{totalValue.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </section>

        {/* QR code de récupération */}
        {showQr && (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 font-semibold text-foreground">
              QR code de récupération
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Présentez ce QR code au préparateur lors de la récupération. Il le
              scannera pour confirmer le retrait.
            </p>

            <div className="flex flex-col items-center gap-4">
              {don.qr_code_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={don.qr_code_url}
                  alt="QR Code de récupération"
                  className="h-48 w-48 rounded-xl border border-border"
                />
              ) : (
                <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                  <QRCodeSVG
                    value={qrValue}
                    size={176}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              )}

              <div className="text-center">
                <p className="mb-1 text-xs text-muted-foreground">
                  Code manuel
                </p>
                <p className="rounded-xl border border-savely-100 bg-savely-50 px-5 py-2 font-mono text-2xl font-bold tracking-widest text-savely-700">
                  {codeDisplay}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  À saisir par le préparateur si le scan ne fonctionne pas
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Cerfa */}
        {don.cerfa_url && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="mb-2 font-semibold text-foreground">
              Reçu fiscal Cerfa disponible
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Réduction fiscale estimée :{' '}
              <strong className="text-primary">
                {(totalValue * 0.6).toFixed(2)} €
              </strong>{' '}
              (60 % — art. 238 bis CGI)
            </p>
            <a
              href={don.cerfa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-savely-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-savely-700"
            >
              ⬇ Télécharger le Cerfa PDF
            </a>
          </section>
        )}
      </div>
    </AssoLayout>
  );
}
