'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Shell from '@/components/shell';
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

export default function OffrePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [offre, setOffre] = useState<Offre | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<
    'detail' | 'accept_done' | 'refuse_form' | 'refuse_done'
  >('detail');

  // Slot selection — titulaire-provided slots vs free inputs
  const [selectedSlot, setSelectedSlot] = useState<PickupSlot | null>(null);
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [pickedUpBy, setPickedUpBy] = useState('');

  const [refusalReason, setRefusalReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace('/auth/verify');
      return;
    }
    fetchOffre(id)
      .then(setOffre)
      .catch(() => router.replace('/offres'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const titulaireSLots: PickupSlot[] =
    offre?.donation?.pickup_windows?.filter(
      (s) => new Date(s.start) > new Date()
    ) ?? [];
  const hasTitulaireSlots = titulaireSLots.length > 0;

  const handleAccept = async () => {
    const effectiveStart = hasTitulaireSlots
      ? selectedSlot?.start
      : slotStart
        ? new Date(slotStart).toISOString()
        : undefined;
    const effectiveEnd = hasTitulaireSlots
      ? selectedSlot?.end
      : slotEnd
        ? new Date(slotEnd).toISOString()
        : undefined;

    if (!effectiveStart || !effectiveEnd) {
      setError('Veuillez sélectionner un créneau de récupération');
      return;
    }
    if (!pickedUpBy.trim()) {
      setError('Veuillez indiquer le nom du récupérateur');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await accepterOffre(id, {
        pickup_slot_start: effectiveStart,
        pickup_slot_end: effectiveEnd,
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

  if (loading)
    return (
      <Shell>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  if (!offre) return null;

  const totalValue = offre.proposed_lines.reduce(
    (s, l) => s + l.quantity * l.unit_value,
    0
  );

  return (
    <Shell>
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Retour
      </button>

      {view === 'accept_done' && (
        <div className="bg-white border border-green-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-2xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-gray-900">Don accepté !</h2>
          <p className="text-gray-600">
            Rendez-vous à l&apos;officine au créneau convenu. Votre QR code de
            récupération est disponible dans l&apos;onglet <strong>Dons</strong>.
          </p>
          <button
            onClick={() => router.push('/dons')}
            className="mt-2 bg-savely-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-savely-700 transition-colors"
          >
            Voir mes dons
          </button>
        </div>
      )}

      {view === 'refuse_done' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
          <div className="text-3xl">🙏</div>
          <h2 className="text-xl font-bold text-gray-900">Refus enregistré</h2>
          <p className="text-gray-500 text-sm">
            L&apos;officine en sera informée. Merci pour votre réponse.
          </p>
          <button
            onClick={() => router.push('/offres')}
            className="mt-2 border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Retour aux offres
          </button>
        </div>
      )}

      {view === 'refuse_form' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-lg">
          <h2 className="font-semibold text-gray-900">Raison du refus</h2>
          <div className="space-y-2">
            {[...REFUSAL_REASONS, 'Autre'].map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-savely-400 transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={refusalReason === r}
                  onChange={() => setRefusalReason(r)}
                  className="text-savely-600"
                />
                <span className="text-sm text-gray-800">{r}</span>
              </label>
            ))}
          </div>
          {refusalReason === 'Autre' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Précisez…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 outline-none"
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setView('detail')}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleRefuse}
              disabled={!refusalReason || submitting}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Envoi…' : 'Confirmer le refus'}
            </button>
          </div>
        </div>
      )}

      {view === 'detail' && (
        <div className="space-y-6 max-w-2xl">
          {/* Fiche don */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              Offre de don
            </h1>
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                De
              </p>
              <p className="font-semibold text-gray-900">
                {offre.donation?.pharmacy?.name}
              </p>
              {offre.donation?.pharmacy?.address && (
                <p className="text-sm text-gray-600">
                  {offre.donation.pharmacy.address}
                </p>
              )}
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Produits proposés
              </p>
              <div className="space-y-2">
                {offre.proposed_lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-800">
                      {l.name}{' '}
                      <span className="text-gray-500">× {l.quantity}</span>
                    </span>
                    <span className="text-gray-600 font-medium">
                      {(l.quantity * l.unit_value).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between text-sm font-semibold">
                <span>Valeur totale HT</span>
                <span className="text-savely-700">
                  {totalValue.toFixed(2)} €
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⏰ Expire le {fmt(offre.expires_at)}
            </p>
          </div>

          {/* Formulaire d'acceptation */}
          {offre.status === 'ENVOYEE' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">
                Créneau de récupération
              </h2>

              {hasTitulaireSlots ? (
                /* ── Créneaux fixés par le titulaire ────────────────── */
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    L&apos;officine a proposé les créneaux suivants. Sélectionnez
                    celui qui vous convient :
                  </p>
                  {titulaireSLots.map((slot) => {
                    const { date, heure } = fmtSlot(slot);
                    const isSelected =
                      selectedSlot?.start === slot.start &&
                      selectedSlot?.end === slot.end;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-savely-600 bg-savely-50'
                            : 'border-gray-200 hover:border-savely-300 bg-white'
                        }`}
                      >
                        <p className="font-medium text-gray-900 capitalize">
                          {date}
                        </p>
                        <p className="text-sm text-savely-700 font-semibold mt-0.5">
                          🕐 {heure}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ── Saisie libre (pas de créneaux fixés) ───────────── */
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Indiquez quand vous pourrez passer récupérer le don :
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Début *
                      </label>
                      <input
                        type="datetime-local"
                        value={slotStart}
                        onChange={(e) => setSlotStart(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Fin *
                      </label>
                      <input
                        type="datetime-local"
                        value={slotEnd}
                        onChange={(e) => setSlotEnd(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nom du récupérateur *
                </label>
                <input
                  value={pickedUpBy}
                  onChange={(e) => setPickedUpBy(e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 outline-none"
                />
              </div>

              <p className="text-xs text-gray-500">
                En acceptant, vous vous engagez à récupérer les produits au
                créneau choisi. Un reçu fiscal Cerfa vous sera transmis après
                récupération.
              </p>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  disabled={
                    submitting ||
                    (hasTitulaireSlots ? !selectedSlot : !slotStart || !slotEnd)
                  }
                  className="flex-1 bg-savely-600 text-white py-3 rounded-xl font-semibold hover:bg-savely-700 disabled:opacity-40 transition-colors"
                >
                  {submitting ? 'Envoi…' : '✅ Accepter ce don'}
                </button>
                <button
                  onClick={() => setView('refuse_form')}
                  className="px-4 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
