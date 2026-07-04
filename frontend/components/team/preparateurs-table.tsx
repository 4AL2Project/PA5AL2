'use client';

import { Loader2, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Preparateur } from '@/lib/auth';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

const EMPTY: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
};

function preparateurName(p: Preparateur): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return full || p.email;
}

function PreparateurDialog({
  endpointBase,
  target,
  open,
  onOpenChange,
}: {
  /** Préfixe d'URL des mutations préparateur (ex: /api/be/api/pharmacies/me/preparateurs). */
  endpointBase: string;
  /** Préparateur à modifier, ou null pour un ajout. */
  target: Preparateur | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise le formulaire à chaque ouverture.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(
        target
          ? {
              first_name: target.first_name ?? '',
              last_name: target.last_name ?? '',
              email: target.email,
              phone: target.phone ?? '',
            }
          : EMPTY
      );
      setError(null);
    }
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = Object.values(form).every((v) => v.trim().length > 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = target ? `${endpointBase}/${target.user_id}` : endpointBase;
      const res = await fetch(url, {
        method: target ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setError('Cet email est déjà associé à un compte.');
        } else if (res.status === 400) {
          setError('Certains champs sont invalides.');
        } else {
          setError('Une erreur est survenue. Réessayez.');
        }
        return;
      }
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target ? 'Modifier le préparateur' : 'Ajouter un préparateur'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prep-last">Nom</Label>
              <Input
                id="prep-last"
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prep-first">Prénom</Label>
              <Input
                id="prep-first"
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prep-email">Email</Label>
            <Input
              id="prep-email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prep-phone">Téléphone</Label>
            <Input
              id="prep-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {target ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tableau de gestion des préparateurs de commande (ajout / édition / suppression).
 * Réutilisé côté admin (officine ciblée) et côté titulaire (mon officine) :
 * seul `endpointBase` change.
 */
export function PreparateursTable({
  endpointBase,
  preparateurs,
  emptyDescription,
}: {
  endpointBase: string;
  preparateurs: Preparateur[];
  emptyDescription: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Preparateur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Preparateur | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (p: Preparateur) => {
    setEditTarget(p);
    setDialogOpen(true);
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${endpointBase}/${deleteTarget.user_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Préparateurs de commande</h2>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <UserPlus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {preparateurs.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Aucun préparateur</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nom</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Téléphone</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preparateurs.map((p) => (
                <TableRow key={p.user_id}>
                  <TableCell className="text-xs font-medium">
                    {preparateurName(p)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.email}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Modifier ${preparateurName(p)}`}
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Supprimer ${preparateurName(p)}`}
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PreparateurDialog
        endpointBase={endpointBase}
        target={editTarget}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce préparateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `${preparateurName(deleteTarget)} perdra l’accès à l’officine. Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
