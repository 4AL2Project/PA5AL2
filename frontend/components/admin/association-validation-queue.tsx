'use client';

// File de validation des associations auto-inscrites depuis la landing.
// L'admin vérifie le RNA/SIREN (lien vers le répertoire national), coche
// l'éligibilité au reçu fiscal, puis valide ou rejette (motif requis).

import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MailCheck,
  MailX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Association } from '@/lib/admin';

function registryUrl(rnaOrSiren: string | null): string | null {
  if (!rnaOrSiren) return null;
  const cleaned = rnaOrSiren.replace(/\s/g, '');
  // RNA (W + 9 chiffres) → répertoire national des associations ;
  // sinon SIREN → annuaire des entreprises
  if (/^W\d+/i.test(cleaned)) {
    return `https://www.journal-officiel.gouv.fr/pages/associations-recherche/?q=${encodeURIComponent(cleaned)}`;
  }
  return `https://annuaire-entreprises.data.gouv.fr/entreprise/${encodeURIComponent(cleaned)}`;
}

export function AssociationValidationQueue({
  pending,
}: {
  pending: Association[];
}) {
  const router = useRouter();
  const [fiscalChecked, setFiscalChecked] = useState<Record<string, boolean>>(
    {}
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toReject, setToReject] = useState<Association | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (pending.length === 0) return null;

  const handleValidate = async (asso: Association) => {
    setBusyId(asso.association_id);
    try {
      const res = await fetch(
        `/api/be/api/associations/${asso.association_id}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fiscal_receipt_verified:
              fiscalChecked[asso.association_id] ?? false,
          }),
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.error?.message ?? 'Validation impossible');
        return;
      }
      toast.success(`${asso.name} validée — elle entre dans le matching`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!toReject || !rejectReason.trim()) return;
    setBusyId(toReject.association_id);
    try {
      const res = await fetch(
        `/api/be/api/associations/${toReject.association_id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        }
      );
      if (!res.ok) {
        toast.error('Rejet impossible');
        return;
      }
      toast.success(`${toReject.name} rejetée`);
      setToReject(null);
      setRejectReason('');
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/40">
      <div className="border-b border-amber-200 px-4 py-3">
        <h2 className="text-sm font-semibold">
          En attente de validation ({pending.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Inscriptions reçues depuis la landing publique.
        </p>
      </div>
      <ul className="divide-y divide-amber-100">
        {pending.map((asso) => {
          const link = registryUrl(asso.rna_or_siren);
          const emailVerified = asso.email_verified_at != null;
          return (
            <li key={asso.association_id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{asso.name}</p>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary underline"
                      >
                        {asso.rna_or_siren}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {emailVerified ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        <MailCheck className="mr-1 h-3 w-3" />
                        Email vérifié
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        <MailX className="mr-1 h-3 w-3" />
                        Email non vérifié
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rayon {asso.action_radius_km} km autour de {asso.city} ·{' '}
                    {asso.categories.join(', ')} · {asso.contact_email} ·{' '}
                    {asso.contact_phone}
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs">
                    <Checkbox
                      checked={fiscalChecked[asso.association_id] ?? false}
                      onCheckedChange={(v) =>
                        setFiscalChecked((m) => ({
                          ...m,
                          [asso.association_id]: v === true,
                        }))
                      }
                    />
                    Éligibilité reçu fiscal vérifiée (art. 200 / 238 bis CGI)
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === asso.association_id || !emailVerified}
                    onClick={() => handleValidate(asso)}
                  >
                    {busyId === asso.association_id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    )}
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === asso.association_id}
                    onClick={() => setToReject(asso)}
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={toReject != null}
        onOpenChange={(open) => !open && setToReject(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter « {toReject?.name} »</DialogTitle>
            <DialogDescription>
              Le motif sera communiqué à l&apos;association par email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Motif *</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex. : RNA introuvable au répertoire national…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToReject(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || busyId != null}
              onClick={handleReject}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
