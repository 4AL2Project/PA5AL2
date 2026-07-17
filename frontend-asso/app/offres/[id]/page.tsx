'use client';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssoLayout } from '@/components/asso-layout';
import {
  accepterOffre,
  fetchOffre,
  type Offre,
  type PickupSlot,
  refuserOffre,
} from '@/lib/api';

const REFUSAL_REASONS = [
  'Capacité insuffisante actuellement',
  'Catégorie non acceptée',
  'Créneau non compatible',
];

function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function fmtSlot(slot: PickupSlot) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const date = start.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const heureDebut = start.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const heureFin = end.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, heure: `${heureDebut} – ${heureFin}` };
}

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring';

export default function OffrePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [offre, setOffre] = useState<Offre | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<
    'detail' | 'accept_done' | 'refuse_form' | 'refuse_done'
  >('detail');

  const [selectedSlot, setSelectedSlot] = useState<PickupSlot | null>(null);
  const [pickedUpBy, setPickedUpBy] = useState('');

  const [refusalReason, setRefusalReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace(`/auth/login?redirect=/offres/${id}`);
      return;
    }
    fetchOffre(id)
      .then(setOffre)
      .catch(() => router.replace('/offres'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Filtre sur la fin du créneau : affiche aussi les créneaux en cours
  // (commencés mais pas encore terminés), pas seulement les futurs.
  const titulaireSlots: PickupSlot[] =
    offre?.donation?.pickup_windows?.filter(
      (s) => new Date(s.end) > new Date()
    ) ?? [];
  const hasTitulaireSlots = titulaireSlots.length > 0;

  const handleAccept = async () => {
    if (hasTitulaireSlots && !selectedSlot) {
      setError('Veuillez sélectionner un créneau de récupération');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await accepterOffre(id, {
        pickup_slot_start: selectedSlot?.start,
        pickup_slot_end: selectedSlot?.end,
        picked_up_by: pickedUpBy.trim(),
      });
      setView('accept_done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    setSubmitting(true);
    setError('');
    try {
      await refuserOffre(id, {
        reason: refusalReason === 'Autre' ? customReason : refusalReason,
      });
      setView('refuse_done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumb = (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Retour aux offres
    </button>
  );

  if (loading)
    return (
      <AssoLayout title="Offre de don" breadcrumb={breadcrumb}>
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AssoLayout>
    );
  if (!offre) return null;

  const totalValue = offre.proposed_lines.reduce(
    (s, l) => s + l.quantity * l.unit_value,
    0
  );

  return (
    <AssoLayout title="Offre de don" breadcrumb={breadcrumb}>
      {view === 'accept_done' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Don accepté !</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Rendez-vous à l&apos;officine au créneau convenu. Votre QR code de
            récupération est disponible dans l&apos;onglet{' '}
            <strong>Mes dons</strong>.
          </p>
          <button
            onClick={() => router.push('/dons')}
            className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voir mes dons
          </button>
        </div>
      )}

      {view === 'refuse_done' && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="mb-2 text-3xl">🙏</p>
          <h2 className="text-xl font-bold text-foreground">
            Refus enregistré
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            L&apos;officine en sera informée. Merci pour votre réponse.
          </p>
          <button
            onClick={() => router.push('/offres')}
            className="mt-4 rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour aux offres
          </button>
        </div>
      )}

      {view === 'refuse_form' && (
        <div className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Raison du refus</h2>
          <div className="space-y-2">
            {[...REFUSAL_REASONS, 'Autre'].map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={refusalReason === r}
                  onChange={() => setRefusalReason(r)}
                  className="text-primary"
                />
                <span className="text-sm text-foreground">{r}</span>
              </label>
            ))}
          </div>
          {refusalReason === 'Autre' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Précisez…"
              rows={3}
              className={inputCls}
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setView('detail')}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              onClick={handleRefuse}
              disabled={!refusalReason || submitting}
              className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'Envoi…' : 'Confirmer le refus'}
            </button>
          </div>
        </div>
      )}

      {view === 'detail' && (
        <div className="max-w-2xl space-y-4">
          {/* Fiche don */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <p className="mb-0.5 text-xs font-medium uppercase text-muted-foreground">
                De
              </p>
              <p className="font-semibold text-foreground">
                {offre.donation?.pharmacy?.name}
              </p>
              {offre.donation?.pharmacy?.address && (
                <p className="text-sm text-muted-foreground">
                  {offre.donation.pharmacy.address}
                </p>
              )}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Produits proposés
              </p>
              <div className="space-y-1.5">
                {offre.proposed_lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {l.name}{' '}
                      <span className="text-muted-foreground">
                        × {l.quantity}
                      </span>
                    </span>
                    <span className="font-medium text-foreground">
                      {(l.quantity * l.unit_value).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Valeur totale HT</span>
                <span className="text-primary">{totalValue.toFixed(2)} €</span>
              </div>
            </div>

            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⏰ Expire le {fmt(offre.expires_at)}
            </p>
          </div>

          {/* Formulaire d'acceptation */}
          {offre.status === 'ENVOYEE' && (
            <div className="space-y-5 rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground">
                Créneau de récupération
              </h2>

              {hasTitulaireSlots ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    L&apos;officine a fixé les créneaux suivants. Choisissez
                    celui qui vous convient :
                  </p>
                  {titulaireSlots.map((slot) => {
                    const { date, heure } = fmtSlot(slot);
                    const isSelected =
                      selectedSlot?.start === slot.start &&
                      selectedSlot?.end === slot.end;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <p className="font-medium capitalize text-foreground">
                          {date}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-primary">
                          🕐 {heure}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    En acceptant, vous confirmez votre disponibilité pour
                    récupérer ce don dans les prochains jours aux horaires
                    d&apos;ouverture de l&apos;officine.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nom du récupérateur{' '}
                  <span className="font-normal text-muted-foreground/70">
                    (optionnel)
                  </span>
                </label>
                <input
                  value={pickedUpBy}
                  onChange={(e) => setPickedUpBy(e.target.value)}
                  placeholder="Prénom Nom"
                  className={inputCls}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                En acceptant, vous vous engagez à récupérer les produits au
                créneau choisi. Un reçu fiscal Cerfa vous sera transmis après
                récupération.
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  disabled={submitting || (hasTitulaireSlots && !selectedSlot)}
                  className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
                >
                  {submitting ? 'Envoi…' : '✅ Accepter ce don'}
                </button>
                <button
                  onClick={() => setView('refuse_form')}
                  className="rounded-xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AssoLayout>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
