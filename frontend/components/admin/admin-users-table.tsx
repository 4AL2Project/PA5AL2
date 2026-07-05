'use client';

import {
  MailCheck,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AdminUser,
  deactivateAdminUser,
  resendAdminUserInvitation,
  setAdminUserStatus,
  updateAdminUser,
} from '@/lib/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function displayName(user: AdminUser): string {
  const full = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return full || user.email;
}

interface Props {
  users: AdminUser[];
  currentUserId: string;
  totalActiveAdmins: number;
}

export function AdminUsersTable({
  users,
  currentUserId,
  totalActiveAdmins,
}: Props) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);

  const isSelf = (u: AdminUser) => u.user_id === currentUserId;
  const isLastActive = (u: AdminUser) =>
    u.status === 'ACTIVE' && totalActiveAdmins <= 1;

  async function handleStatusToggle(user: AdminUser) {
    const next = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(true);
    try {
      await setAdminUserStatus(user.user_id, next);
      toast.success(next === 'INACTIVE' ? 'Compte désactivé' : 'Compte activé');
      router.refresh();
    } catch {
      toast.error('Impossible de modifier le statut');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(user: AdminUser) {
    setLoading(true);
    try {
      await deactivateAdminUser(user.user_id);
      toast.success('Compte désactivé');
      router.refresh();
    } catch {
      toast.error('Impossible de désactiver ce compte');
    } finally {
      setLoading(false);
      setConfirmTarget(null);
    }
  }

  async function handleResend(user: AdminUser) {
    try {
      await resendAdminUserInvitation(user.user_id);
      toast.success('Invitation renvoyée');
    } catch {
      toast.error("Impossible de renvoyer l'invitation");
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setLoading(true);
    try {
      await updateAdminUser(editTarget.user_id, {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      toast.success('Informations mises à jour');
      router.refresh();
      setEditTarget(null);
    } catch {
      toast.error('Impossible de mettre à jour');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Nom</TableHead>
            <TableHead className="text-xs">Email</TableHead>
            <TableHead className="text-xs">Statut</TableHead>
            <TableHead className="text-xs">Créé le</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-xs text-muted-foreground py-8"
              >
                Aucun administrateur enregistré.
              </TableCell>
            </TableRow>
          )}
          {users.map((user) => {
            const self = isSelf(user);
            const lastActive = isLastActive(user);
            const canDeactivate = !self && !lastActive;

            return (
              <TableRow key={user.user_id}>
                <TableCell className="text-xs font-medium">
                  {displayName(user)}
                  {self && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      (vous)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.status === 'ACTIVE' ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <MailCheck className="h-3 w-3" />
                      Actif
                    </Badge>
                  ) : user.status === 'PENDING' ? (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Send className="h-3 w-3" />
                      Invité
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      Inactif
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem
                        className="text-xs gap-2"
                        onSelect={() => {
                          setEditTarget(user);
                          setFirstName(user.first_name ?? '');
                          setLastName(user.last_name ?? '');
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </DropdownMenuItem>

                      {user.status === 'PENDING' && (
                        <DropdownMenuItem
                          className="text-xs gap-2"
                          onSelect={() => handleResend(user)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Renvoyer l&apos;invitation
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {canDeactivate ? (
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                          onSelect={() => setConfirmTarget(user)}
                        >
                          <PowerOff className="h-3.5 w-3.5" />
                          Désactiver
                        </DropdownMenuItem>
                      ) : user.status === 'INACTIVE' ? (
                        <DropdownMenuItem
                          className="text-xs gap-2"
                          onSelect={() => handleStatusToggle(user)}
                        >
                          <Power className="h-3.5 w-3.5" />
                          Réactiver
                        </DropdownMenuItem>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground cursor-not-allowed">
                                <PowerOff className="h-3.5 w-3.5" />
                                Désactiver
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {self
                                ? 'Vous ne pouvez pas désactiver votre propre compte'
                                : 'Dernier admin actif — impossible de désactiver'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Dialog modification */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Modifier l&apos;administrateur
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Prénom</Label>
              <Input
                className="h-8 text-xs"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Nom</Label>
              <Input
                className="h-8 text-xs"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(null)}
            >
              Annuler
            </Button>
            <Button size="sm" onClick={handleEdit} disabled={loading}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation désactivation */}
      <Dialog
        open={!!confirmTarget}
        onOpenChange={() => setConfirmTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Désactiver cet administrateur ?
            </DialogTitle>
            <DialogDescription className="text-xs">
              {confirmTarget && (
                <>
                  Le compte de <strong>{displayName(confirmTarget)}</strong>{' '}
                  sera désactivé. Il ne pourra plus se connecter au back-office.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmTarget(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmTarget && handleDeactivate(confirmTarget)}
              disabled={loading}
            >
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
