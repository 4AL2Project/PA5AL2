'use client';

import { AlertTriangle, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

interface ResetResult {
  truncated_tables: string[];
  seeded: boolean;
}

export function DevResetPanel() {
  const router = useRouter();
  const [seed, setSeed] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const handleReset = async () => {
    setPending(true);
    try {
      const res = await fetch('/api/admin/dev/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? `Erreur ${res.status}`);
      }
      // L'API enveloppe ses réponses dans `{ success, data }`.
      const payload = (await res.json()) as
        | { success: true; data: ResetResult }
        | ResetResult;
      const result = 'success' in payload ? payload.data : payload;
      toast.success(
        result.seeded
          ? `Base vidée (${result.truncated_tables.length} tables) et seed rejoué`
          : `Base vidée (${result.truncated_tables.length} tables)`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Le reset a échoué');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Vider la base de données</h2>
          <p className="text-xs text-muted-foreground">
            Supprime toutes les lignes de toutes les tables : officines,
            utilisateurs, produits, dons, commandes. L’action est immédiate et
            irréversible.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="dev-seed" className="text-xs font-medium">
            Rejouer le seed après le vidage
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Recrée les comptes de démo (admin@savely.fr, demo@cosmorisk.fr), les
            catégories, associations et produits.
          </p>
        </div>
        <Switch
          id="dev-seed"
          checked={seed}
          onCheckedChange={setSeed}
          disabled={pending}
        />
      </div>

      {!seed && (
        <p className="mt-3 flex items-start gap-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          Sans seed, le compte admin est supprimé : votre session reste ouverte
          mais vous ne pourrez plus vous reconnecter sans relancer{' '}
          <code className="font-mono">pnpm -F backend prisma:seed</code>.
        </p>
      )}

      <Button
        variant="destructive"
        className="mt-5"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        {pending ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <Database className="h-3.5 w-3.5" />
        )}
        {pending ? 'Reset en cours…' : 'Vider la base'}
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Vider la base de données ?"
        description={
          seed
            ? 'Toutes les données seront supprimées, puis le seed de démo sera rejoué. Cette action est irréversible.'
            : 'Toutes les données seront supprimées, sans rejouer le seed : la base restera vide et le compte admin disparaîtra. Cette action est irréversible.'
        }
        confirmLabel="Vider la base"
        onConfirm={handleReset}
      />
    </div>
  );
}
