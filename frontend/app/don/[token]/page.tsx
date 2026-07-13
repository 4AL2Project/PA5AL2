'use client';

// Page publique tokenisée : l'asso répond à une proposition de don.
// Mobile-first (les bénévoles ouvrent ce lien sur téléphone).
// Tout token non actionnable affiche une page d'état, jamais une erreur brute.

import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Minus,
  Plus,
  XCircle,
} from 'lucide-react';
import { use, useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProposalLine {
  product_id: string;
  name: string;
  quantity: number;
  unit_value: number;
}

interface PickupSlot {
  start: string;
  end: string;
}

interface ProposalView {
  state:
    | 'ACTIVE'
    | 'ACCEPTEE'
    | 'REFUSEE'
    | 'EXPIREE'
    | 'REMPLACEE'
    | 'DON_ANNULE';
  association_name: string;
  pharmacy: { name: string; address: string | null };
  lines: ProposalLine[];
  expires_at: string;
  slots?: PickupSlot[];
  allocation?: {
    lines: ProposalLine[];
    status: string;
    pickup_slot_start: string;
    pickup_slot_end: string;
  } | null;
}

type Mode = 'CHOICE' | 'PARTIAL' | 'REFUSE';

async function fetchView(token: string): Promise<ProposalView | null> {
  const res = await fetch(`/api/be/api/public/don/${token}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  return payload && payload.success ? (payload.data as ProposalView) : null;
}

function formatSlot(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const hm = (d: Date) =>
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${hm(start)} – ${hm(end)}`;
}

export default function DonProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [view, setView] = useState<ProposalView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>('CHOICE');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [slot, setSlot] = useState<PickupSlot | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const fresh = await fetchView(token);
    if (!fresh) {
      setNotFound(true);
    } else {
      setView(fresh);
      setQuantities(
        Object.fromEntries(fresh.lines.map((l) => [l.product_id, l.quantity]))
      );
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (body: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/be/api/public/don/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        // La proposition n'est plus disponible : on recharge l'état réel
        await load();
        setMode('CHOICE');
        return;
      }
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          payload?.error?.message ??
            'Une erreur est survenue — réessayez dans un instant'
        );
        return;
      }
      if (payload?.success) {
        setView(payload.data as ProposalView);
        setMode('CHOICE');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = (partial: boolean) => {
    if (!view || !slot) {
      setError('Choisissez un créneau de récupération');
      return;
    }
    void submit({
      decision: 'ACCEPT',
      slot_start: slot.start,
      slot_end: slot.end,
      ...(partial
        ? {
            lines: view.lines.map((l) => ({
              product_id: l.product_id,
              quantity: quantities[l.product_id] ?? 0,
            })),
          }
        : {}),
    });
  };

  const handleRefuse = () => {
    void submit({
      decision: 'REFUSE',
      ...(refusalReason.trim() ? { refusal_reason: refusalReason.trim() } : {}),
    });
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  if (notFound || !view) {
    return (
      <Shell>
        <StatePanel
          icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
          title="Lien invalide"
          text="Ce lien ne correspond à aucune proposition de don. Vérifiez l'adresse reçue par email."
        />
      </Shell>
    );
  }

  const totalValue = view.lines.reduce(
    (s, l) => s + l.quantity * l.unit_value,
    0
  );

  // ── Pages d'état (token non actionnable) ─────────────────────────────────
  if (view.state !== 'ACTIVE') {
    return (
      <Shell>
        {view.state === 'ACCEPTEE' && view.allocation ? (
          <StatePanel
            icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />}
            title="Don accepté — merci !"
            text={`Retrait ${formatSlot(view.allocation.pickup_slot_start, view.allocation.pickup_slot_end)}`}
          >
            <PharmacyCard pharmacy={view.pharmacy} />
            <LinesCard
              lines={view.allocation.lines}
              title="Produits à récupérer"
            />
            {view.allocation.status === 'RETIREE' && (
              <p className="text-sm text-emerald-700">
                Retrait confirmé — votre reçu fiscal vous a été envoyé par
                email.
              </p>
            )}
            {view.allocation.status === 'NON_RECUPEREE' && (
              <p className="text-sm text-destructive">
                Le retrait n&apos;a pas été effectué dans le délai : le lot a
                été reproposé à une autre association.
              </p>
            )}
          </StatePanel>
        ) : view.state === 'REFUSEE' ? (
          <StatePanel
            icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
            title="Proposition refusée"
            text="Vous avez décliné ce don. Le lot est proposé à une autre association."
          />
        ) : view.state === 'DON_ANNULE' ? (
          <StatePanel
            icon={<XCircle className="h-10 w-10 text-muted-foreground" />}
            title="Don annulé par la pharmacie"
            text="Cette proposition n'est plus d'actualité."
          />
        ) : view.state === 'REMPLACEE' ? (
          <StatePanel
            icon={<Clock className="h-10 w-10 text-muted-foreground" />}
            title="Proposition remplacée"
            text="Ce lot a été attribué ou reproposé. Vous recevrez de nouvelles propositions par email."
          />
        ) : (
          <StatePanel
            icon={<Clock className="h-10 w-10 text-muted-foreground" />}
            title="Proposition expirée"
            text="Le délai de réponse est dépassé : le lot a été proposé à une autre association. Vous recevrez de nouvelles propositions par email."
          />
        )}
      </Shell>
    );
  }

  // ── Proposition active ────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">
            {view.pharmacy.name} vous propose un don
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bonjour {view.association_name} — répondez avant le{' '}
            {new Date(view.expires_at).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
        </div>

        <PharmacyCard pharmacy={view.pharmacy} />

        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">
            Lot proposé{' '}
            <span className="text-muted-foreground font-normal">
              (valeur indicative {totalValue.toFixed(2)} €)
            </span>
          </p>
          <ul className="space-y-3">
            {view.lines.map((line) => (
              <li
                key={line.product_id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.quantity} unité{line.quantity > 1 ? 's' : ''}
                  </p>
                </div>
                {mode === 'PARTIAL' && (
                  <QuantityStepper
                    value={quantities[line.product_id] ?? 0}
                    max={line.quantity}
                    onChange={(v) =>
                      setQuantities((q) => ({ ...q, [line.product_id]: v }))
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        {mode !== 'REFUSE' && (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4" />
              Créneau de récupération
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Vos bénévoles se déplacent à l&apos;officine. Choisissez un
              créneau :
            </p>
            <div className="grid gap-2">
              {(view.slots ?? []).map((s) => {
                const active = slot?.start === s.start;
                return (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'hover:border-primary/40'
                    }`}
                  >
                    {formatSlot(s.start, s.end)}
                  </button>
                );
              })}
              {(view.slots ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun créneau disponible — contactez la pharmacie.
                </p>
              )}
            </div>
          </div>
        )}

        {mode === 'REFUSE' && (
          <div className="rounded-xl border bg-card p-4">
            <Label htmlFor="refusal-reason" className="text-sm">
              Motif du refus{' '}
              <span className="font-normal text-muted-foreground">
                (optionnel)
              </span>
            </Label>
            <Textarea
              id="refusal-reason"
              className="mt-2"
              rows={3}
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder="Ex. : nous ne distribuons pas ce type de produits…"
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2 pb-8">
          {mode === 'CHOICE' && (
            <>
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => handleAccept(false)}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Tout accepter
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={submitting}
                onClick={() => setMode('PARTIAL')}
              >
                Accepter partiellement
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={() => setMode('REFUSE')}
              >
                Refuser
              </Button>
            </>
          )}
          {mode === 'PARTIAL' && (
            <>
              <Button
                className="w-full"
                disabled={
                  submitting || Object.values(quantities).every((q) => q === 0)
                }
                onClick={() => handleAccept(true)}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmer ces quantités
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={() => setMode('CHOICE')}
              >
                Retour
              </Button>
            </>
          )}
          {mode === 'REFUSE' && (
            <>
              <Button
                variant="destructive"
                className="w-full"
                disabled={submitting}
                onClick={handleRefuse}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmer le refus
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={() => setMode('CHOICE')}
              >
                Retour
              </Button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <Heart className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">
            Savely — Dons solidaires
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}

function StatePanel({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex justify-center">{icon}</div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {text}
        </p>
      </div>
      {children}
    </div>
  );
}

function PharmacyCard({
  pharmacy,
}: {
  pharmacy: { name: string; address: string | null };
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Building2 className="h-4 w-4" />
        {pharmacy.name}
      </p>
      {pharmacy.address && (
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {pharmacy.address}
        </p>
      )}
    </div>
  );
}

function LinesCard({ lines, title }: { lines: ProposalLine[]; title: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l.product_id} className="text-sm text-muted-foreground">
            {l.name} × {l.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="w-8 text-center text-sm tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
