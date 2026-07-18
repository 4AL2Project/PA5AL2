'use client';

// Fiche détaillée d'une association (titulaire) : profil, catégories,
// créneaux, fiabilité, historique des dons de MON officine (Cerfa
// téléchargeables) et total avec économie fiscale (60 % — art. 238 bis CGI).

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  PackageX,
  Pencil,
  Phone,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AssociationEditDrawer } from '@/components/annuaire/association-edit-drawer';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AssociationFiche,
  donationCerfaUrl,
  fetchAssociationFiche,
} from '@/lib/api';

function euros(v: number): string {
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function AssociationFichePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [fiche, setFiche] = useState<AssociationFiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFiche(await fetchAssociationFiche(id));
    } catch {
      toast.error('Impossible de charger cette association');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout
      title={fiche?.name ?? 'Association'}
      breadcrumb={
        <Link
          href="/annuaire"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour annuaire
        </Link>
      }
      actions={
        fiche ? (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Modifier
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !fiche ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Association introuvable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Coordonnées */}
          <section className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              {fiche.name}
            </p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {fiche.address}, {fiche.postal_code} {fiche.city}
                {fiche.distance_km != null && ` — ${fiche.distance_km} km`}
              </p>
              {fiche.contact_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {fiche.contact_phone}
                </p>
              )}
              {fiche.contact_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {fiche.contact_email}
                </p>
              )}
            </div>
          </section>

          {/* Catégories */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Catégories acceptées
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {fiche.categories.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </section>

          {/* Fiabilité */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Fiabilité
            </h2>
            <p className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">
                {Math.round(fiche.stats.smoothed_reliability * 100)} %
              </span>
              {fiche.stats.pickup_rate != null && (
                <span className="text-muted-foreground">
                  — {Math.round(fiche.stats.pickup_rate * 100)} % de retraits
                  honorés
                </span>
              )}
            </p>
            {fiche.stats.avg_response_hours != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Délai de réponse moyen :{' '}
                {Math.round(fiche.stats.avg_response_hours)} h ·{' '}
                {fiche.stats.proposals_received} proposition
                {fiche.stats.proposals_received > 1 ? 's' : ''} reçue
                {fiche.stats.proposals_received > 1 ? 's' : ''}
              </p>
            )}
          </section>

          {/* Historique officine */}
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">
                Historique des dons — votre officine
              </h2>
            </div>
            {fiche.history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Aucun don vers cette association pour l&apos;instant.
              </p>
            ) : (
              <ul className="divide-y">
                {fiche.history.map((h) => (
                  <li
                    key={h.allocation_id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {h.status === 'RETIREE' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : h.status === 'NON_RECUPEREE' ? (
                        <PackageX className="h-4 w-4 shrink-0 text-destructive" />
                      ) : (
                        <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <p>
                          {h.lines
                            .map((l) => `${l.name} ×${l.quantity}`)
                            .join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.pickup_slot_start).toLocaleDateString(
                            'fr-FR'
                          )}
                          {h.value != null &&
                            ` · Valeur : ${euros(h.value)} HT`}
                          {h.status === 'NON_RECUPEREE' && ' · Non récupéré'}
                        </p>
                      </div>
                    </div>
                    {h.cerfa_available && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={donationCerfaUrl(h.allocation_id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText className="mr-1.5 h-4 w-4" />
                          Cerfa
                        </a>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Totaux */}
          {fiche.totals.total_value > 0 && (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Total dons officine → cette asso
              </h2>
              <p className="text-sm">
                Valeur totale :{' '}
                <span className="font-semibold">
                  {euros(fiche.totals.total_value)} HT
                </span>
                {' · '}
                Économie fiscale :{' '}
                <span className="font-semibold text-emerald-700">
                  {euros(fiche.totals.tax_savings)}
                </span>{' '}
                <span className="text-xs text-muted-foreground">(60 %)</span>
              </p>
            </section>
          )}
        </div>
      )}

      {fiche && (
        <AssociationEditDrawer
          fiche={fiche}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => {
            setEditOpen(false);
            void load();
          }}
        />
      )}
    </DashboardLayout>
  );
}
