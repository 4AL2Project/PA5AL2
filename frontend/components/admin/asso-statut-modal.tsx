'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';

export type StatutAction = 'SUSPENDRE' | 'REACTIVER' | 'BLACKLISTER';

interface Props {
  action: StatutAction | null;
  assoName: string;
  submitting: boolean;
  onConfirm: (raison: string | undefined) => void;
  onClose: () => void;
}

const CONFIG: Record<
  StatutAction,
  {
    title: string;
    description: string;
    reasonRequired: boolean;
    danger: boolean;
  }
> = {
  SUSPENDRE: {
    title: 'Suspendre',
    description:
      'L’association sortira du matching. Un motif est requis (tracé dans le journal).',
    reasonRequired: true,
    danger: false,
  },
  REACTIVER: {
    title: 'Réactiver',
    description: 'L’association réintègre le matching. Motif optionnel.',
    reasonRequired: false,
    danger: false,
  },
  BLACKLISTER: {
    title: 'Blacklister',
    description:
      'Action irréversible depuis le statut suspendu. Tapez CONFIRMER pour valider.',
    reasonRequired: true,
    danger: true,
  },
};

export function AssoStatutModal({
  action,
  assoName,
  submitting,
  onConfirm,
  onClose,
}: Props) {
  const [raison, setRaison] = useState('');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setRaison('');
    setConfirmText('');
  }, [action]);

  if (!action) return null;
  const cfg = CONFIG[action];

  const canConfirm =
    !submitting &&
    (!cfg.reasonRequired || raison.trim() !== '') &&
    (action !== 'BLACKLISTER' || confirmText === 'CONFIRMER');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {cfg.title} « {assoName} »
          </DialogTitle>
          <DialogDescription>{cfg.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="statut-raison" className="text-xs">
              Motif {cfg.reasonRequired ? '*' : '(optionnel)'}
            </Label>
            <Textarea
              id="statut-raison"
              rows={3}
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="Ex. : plusieurs pickups non honorés…"
            />
          </div>

          {action === 'BLACKLISTER' && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-text" className="text-xs">
                Tapez CONFIRMER
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRMER"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant={cfg.danger ? 'destructive' : 'default'}
            disabled={!canConfirm}
            onClick={() => onConfirm(raison.trim() || undefined)}
          >
            {submitting && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Traduit une action UI vers le statut cible attendu par le backend.
export function statutForAction(action: StatutAction): {
  statut: 'ACTIVE' | 'SUSPENDUE' | 'BLACKLISTEE';
} {
  if (action === 'SUSPENDRE') return { statut: 'SUSPENDUE' };
  if (action === 'BLACKLISTER') return { statut: 'BLACKLISTEE' };
  return { statut: 'ACTIVE' };
}
