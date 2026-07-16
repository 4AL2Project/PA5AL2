'use client';

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

function shortCode(qrCode: string | null): string | null {
  if (!qrCode) return null;
  return qrCode.replace(/-/g, '').toUpperCase().slice(0, 8);
}

export function ConfirmPickupDialog({
  allocation,
  onOpenChange,
  onConfirmed,
}: {
  allocation: DonationAllocationItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (allocation) {
      setCode('');
      setCodeError('');
    }
  }, [allocation]);

  const expected = allocation ? shortCode(allocation.qr_code) : null;

  const handleConfirm = async () => {
    if (!allocation) return;

    if (expected) {
      if (!code.trim()) {
        setCodeError('Saisissez le code affiché sur le téléphone du bénévole');
        return;
      }
      if (code.trim().toUpperCase().replace(/\s/g, '') !== expected) {
        setCodeError('Code incorrect — vérifiez le code affiché sur le téléphone');
        return;
      }
    }

    setSaving(true);
    try {
      await confirmPickup(allocation.allocation_id);
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

        <div className="space-y-4">
          {expected && (
            <div className="space-y-1.5">
              <Label htmlFor="don-code">
                Code du don *
              </Label>
              <Input
                id="don-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError('');
                }}
                placeholder="Ex : AB12CD34"
                maxLength={8}
                className="font-mono uppercase tracking-widest"
                onKeyDown={(e) => e.key === 'Enter' && void handleConfirm()}
              />
              {codeError && (
                <p className="text-xs text-destructive">{codeError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Saisissez le code à 8 caractères affiché sur le téléphone du
                bénévole (en dessous du QR code).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer et générer le Cerfa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
