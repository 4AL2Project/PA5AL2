'use client';

// Confirmation du retrait par le titulaire/préparateur : le nom du
// récupérateur est requis (audit trail Cerfa).

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { confirmPickup, DonationAllocationItem } from '@/lib/api';

export function ConfirmPickupDialog({
  allocation,
  onOpenChange,
  onConfirmed,
}: {
  allocation: DonationAllocationItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const [pickedUpBy, setPickedUpBy] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (allocation) setPickedUpBy('');
  }, [allocation]);

  const handleConfirm = async () => {
    if (!allocation || !pickedUpBy.trim()) return;
    setSaving(true);
    try {
      await confirmPickup(allocation.allocation_id, pickedUpBy.trim());
      toast.success('Retrait confirmé — le reçu Cerfa a été généré');
      onConfirmed();
    } catch {
      toast.error('Impossible de confirmer ce retrait');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={allocation != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer le retrait</DialogTitle>
          <DialogDescription>
            {allocation && (
              <>
                {allocation.association.name} —{' '}
                {allocation.lines
                  .map((l) => `${l.name} ×${l.quantity}`)
                  .join(', ')}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="picked-up-by">
            Nom de la personne venue récupérer *
          </Label>
          <Input
            id="picked-up-by"
            value={pickedUpBy}
            onChange={(e) => setPickedUpBy(e.target.value)}
            placeholder="Prénom Nom"
            maxLength={120}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !pickedUpBy.trim()}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer et générer le Cerfa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
