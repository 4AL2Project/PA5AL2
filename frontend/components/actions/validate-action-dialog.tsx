'use client';

import { Clock } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DormantAction } from '@/lib/types';

const ACTION_OPTIONS: {
  value: DormantAction['type'];
  label: string;
  description: string;
}[] = [
  {
    value: 'DON',
    label: 'Don associatif',
    description: 'Transférer le stock à une association partenaire',
  },
  {
    value: 'B2C',
    label: 'Vente B2C',
    description: 'Publier une offre de revente en ligne (V2)',
  },
];

interface ValidateActionDialogProps {
  action: DormantAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, type: DormantAction['type']) => void;
  onSnooze: (id: string) => void;
  loading: boolean;
}

export function ValidateActionDialog({
  action,
  open,
  onOpenChange,
  onConfirm,
  onSnooze,
  loading,
}: ValidateActionDialogProps) {
  const [selectedType, setSelectedType] = useState<DormantAction['type']>(
    action?.type ?? 'DON'
  );

  // Sync default when action changes (new row opened)
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && action) setSelectedType(action.type);
    onOpenChange(isOpen);
  };

  const handleConfirm = () => {
    if (!action) return;
    onConfirm(action.id, selectedType);
  };

  const selected = ACTION_OPTIONS.find((o) => o.value === selectedType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valider l&apos;action</DialogTitle>
        </DialogHeader>

        {action && (
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {action.productName}
              </span>
              {' — '}
              {action.daysOfCover > 9999
                ? '∞ j. de couverture'
                : `${Math.round(action.daysOfCover)} j. de couverture`}
              {action.capitalLocked != null && (
                <>
                  {' · '}
                  <span className="font-medium text-foreground">
                    {action.capitalLocked.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    })}
                  </span>{' '}
                  immobilisés
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Action à effectuer</label>
              <Select
                value={selectedType}
                onValueChange={(v) =>
                  setSelectedType(v as DormantAction['type'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && (
                <p className="text-xs text-muted-foreground">
                  {selected.description}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (action) onSnooze(action.id);
            }}
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Reporter 48 h
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
