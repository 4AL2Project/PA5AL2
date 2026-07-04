'use client';

import {
  Loader2,
  Mail,
  Pencil,
  Power,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

function preparateurName(p: Preparateur): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return full || p.email;
}

function PreparateurStatus({ status }: { status: Preparateur['status'] }) {
  if (status === 'ACTIVE') {
    return <Badge variant="secondary">Actif</Badge>;
  }
  if (status === 'INACTIVE') {
    return <Badge variant="destructive">Désactivé</Badge>;
  }
  return <Badge variant="outline">Invitation envoyée</Badge>;
}

/** Dialogue d'invitation : uniquement l'adresse email du préparateur. */
function InvitePreparateurDialog({
  endpointBase,
  open,
  onOpenChange,
}: {
  endpointBase: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setEmail('');
      setError(null);
    }
  }

  const canSubmit = email.trim().length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(endpointBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setError('Cet email est déjà associé à un compte.');
        } else if (res.status === 400) {
          setError('Adresse email invalide.');
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
          <DialogTitle>Inviter un préparateur</DialogTitle>
          <DialogDescription>
            Il recevra un email pour créer son compte et choisir son mot de
            passe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Adresse email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="prenom.nom@pharmacie.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoFocus
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
              <Mail className="h-3.5 w-3.5" />
              Envoyer l’invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

/** Détail d'un préparateur : consultation, édition, désactivation, suppression. */
function PreparateurDetailsDialog({
  endpointBase,
  target,
  onOpenChange,
  onRequestDelete,
}: {
  endpointBase: string;
  target: Preparateur | null;
  onOpenChange: (open: boolean) => void;
  onRequestDelete: (p: Preparateur) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise l'état interne à chaque changement de préparateur ciblé.
  const [lastId, setLastId] = useState<string | null>(null);
  const currentId = target?.user_id ?? null;
  if (currentId !== lastId) {
    setLastId(currentId);
    setEditing(false);
    setError(null);
    if (target) {
      setForm({
        first_name: target.first_name ?? '',
        last_name: target.last_name ?? '',
        email: target.email,
        phone: target.phone ?? '',
      });
    }
  }

  if (!target) return null;

  const update = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${endpointBase}/${target.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError(
          res.status === 409
            ? 'Cet email est déjà associé à un compte.'
            : 'Une erreur est survenue. Réessayez.'
        );
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleStatus = async () => {
    setError(null);
    setSubmitting(true);
    const nextStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`${endpointBase}/${target.user_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        setError('Impossible de changer le statut du compte.');
        return;
      }
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const canToggle = target.status === 'ACTIVE' || target.status === 'INACTIVE';

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{preparateurName(target)}</DialogTitle>
          <DialogDescription asChild>
            <span className="inline-flex">
              <PreparateurStatus status={target.status} />
            </span>
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <form onSubmit={onSaveInfo} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="det-last">Nom</Label>
                <Input
                  id="det-last"
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="det-first">Prénom</Label>
                <Input
                  id="det-first"
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="det-email">Email</Label>
              <Input
                id="det-email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="det-phone">Téléphone</Label>
              <Input
                id="det-phone"
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
                onClick={() => setEditing(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="col-span-2">{target.email}</dd>
              <dt className="text-muted-foreground">Téléphone</dt>
              <dd className="col-span-2">{target.phone ?? '—'}</dd>
            </dl>

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(true)}
                disabled={submitting}
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
              {canToggle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onToggleStatus}
                  disabled={submitting}
                >
                  <Power className="h-3.5 w-3.5" />
                  {target.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => onRequestDelete(target)}
                disabled={submitting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tableau de gestion des préparateurs de commande. Réutilisé côté admin
 * (officine ciblée) et côté titulaire (mon officine) : seul `endpointBase`
 * change. Invitation par email, statut, et détail cliquable par ligne.
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Preparateur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Preparateur | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${endpointBase}/${deleteTarget.user_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        setDetailTarget(null);
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
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Inviter
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
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preparateurs.map((p) => (
                <TableRow
                  key={p.user_id}
                  className="cursor-pointer"
                  onClick={() => setDetailTarget(p)}
                >
                  <TableCell className="text-xs font-medium">
                    {p.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <PreparateurStatus status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InvitePreparateurDialog
        endpointBase={endpointBase}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <PreparateurDetailsDialog
        endpointBase={endpointBase}
        target={detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        onRequestDelete={setDeleteTarget}
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
