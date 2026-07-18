'use client';

/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Page de configuration des paramètres de don associatif (seuil
 *   dormance ±30% et rayon de matching). Accessible aux titulaires uniquement.
 * @module DonAssociatif
 */

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import {
  PickupWindow,
  PickupWindowsForm,
} from '@/components/settings/pickup-windows-form';
import { Slider } from '@/components/ui/slider';
import {
  DonParametres,
  fetchDonParametres,
  saveDonParametres,
} from '@/lib/api';

const SEUIL_MIN = 63;
const SEUIL_MAX = 117;
const SEUIL_DEFAULT = 90;
const RAYON_MIN = 10;
const RAYON_MAX = 100;
const RAYON_DEFAULT = 50;

export default function DonParametresPage() {
  const [params, setParams] = useState<DonParametres | null>(null);
  const [seuil, setSeuil] = useState(SEUIL_DEFAULT);
  const [rayon, setRayon] = useState(RAYON_DEFAULT);
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchDonParametres(),
      fetch('/api/be/api/pharmacies/me', { cache: 'no-cache' })
        .then((r) => r.json())
        .then(
          (payload: {
            success?: boolean;
            data?: { donation_pickup_windows?: PickupWindow[] | null };
            donation_pickup_windows?: PickupWindow[] | null;
          }) =>
            (payload.success
              ? payload.data?.donation_pickup_windows
              : payload.donation_pickup_windows) ?? null
        )
        .catch(() => null),
    ])
      .then(([p, windows]) => {
        setParams(p);
        setSeuil(p.seuil_dormance_jours);
        setRayon(p.rayon_matching_km);
        setPickupWindows(windows);
      })
      .catch(() => toast.error('Impossible de charger les paramètres'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveDonParametres({
        seuil_dormance_jours: seuil,
        rayon_matching_km: rayon,
      });
      setParams(updated);
      toast.success('Paramètres enregistrés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    params !== null &&
    (seuil !== params.seuil_dormance_jours ||
      rayon !== params.rayon_matching_km);

  return (
    <DashboardLayout
      title="Paramètres des dons"
      description="Configurez les critères de suggestion et de recherche d'associations pour vos dons associatifs."
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-w-xl space-y-8">
          {/* Seuil de dormance */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Seuil de dormance produits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Savely vous suggère un don quand un produit cosmétique n&apos;a eu
              aucune vente depuis :
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  {SEUIL_MIN} jours
                </span>
                <span className="text-2xl font-bold tabular-nums">
                  {seuil}{' '}
                  <span className="text-base font-normal text-muted-foreground">
                    jours
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {SEUIL_MAX} jours
                </span>
              </div>
              <Slider
                min={SEUIL_MIN}
                max={SEUIL_MAX}
                step={1}
                value={[seuil]}
                onValueChange={([v]) => setSeuil(v)}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Vous pouvez ajuster ce seuil de ±30% autour du défaut de 90 jours
              (entre {SEUIL_MIN} et {SEUIL_MAX} jours).
            </p>
          </section>

          {/* Rayon de matching */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">
              Rayon de recherche des associations
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les associations situées dans ce rayon autour de votre officine
              seront sollicitées lors d&apos;un don.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  {RAYON_MIN} km
                </span>
                <span className="text-2xl font-bold tabular-nums">
                  {rayon}{' '}
                  <span className="text-base font-normal text-muted-foreground">
                    km
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {RAYON_MAX} km
                </span>
              </div>
              <Slider
                min={RAYON_MIN}
                max={RAYON_MAX}
                step={5}
                value={[rayon]}
                onValueChange={([v]) => setRayon(v)}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Défaut : {RAYON_DEFAULT} km. En dessous de {RAYON_MIN} km la
              couverture peut être insuffisante ; au-delà de {RAYON_MAX} km les
              associations auront du mal à venir récupérer.
            </p>
          </section>

          {/* Créneaux hebdomadaires de récupération des dons */}
          <PickupWindowsForm initial={pickupWindows} />

          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer les paramètres
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
