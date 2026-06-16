'use client';

import { Loader2, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

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
import { DormantAction } from '@/lib/types';

interface PublishOfferDialogProps {
  action: DormantAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (
    actionId: string,
    productId: string,
    discountedPrice: number,
    quantityOffered: number
  ) => Promise<void>;
  loading: boolean;
}

export function PublishOfferDialog({
  action,
  open,
  onOpenChange,
  onPublish,
  loading,
}: PublishOfferDialogProps) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<{ price?: string; quantity?: string }>(
    {}
  );

  // Pre-fill when action changes
  useEffect(() => {
    if (action) {
      setPrice(action.unitPrice.toFixed(2));
      setQuantity(String(action.stock));
      setErrors({});
    }
  }, [action]);

  const validate = () => {
    const errs: typeof errors = {};
    const p = parseFloat(price);
    const q = parseInt(quantity, 10);
    if (isNaN(p) || p <= 0) errs.price = 'Prix invalide (doit être > 0)';
    if (action && !isNaN(p) && p > action.unitPrice)
      errs.price = `Prix remisé doit être ≤ prix unitaire (${action.unitPrice.toFixed(2)} €)`;
    if (isNaN(q) || q <= 0) errs.quantity = 'Quantité invalide (doit être > 0)';
    if (action && !isNaN(q) && q > action.stock)
      errs.quantity = `Ne peut pas dépasser le stock disponible (${action.stock})`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!action || !validate()) return;
    await onPublish(
      action.id,
      action.productId,
      parseFloat(price),
      parseInt(quantity, 10)
    );
  };

  const discount =
    action && parseFloat(price) > 0
      ? Math.round((1 - parseFloat(price) / action.unitPrice) * 100)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Publier une offre B2C
          </DialogTitle>
        </DialogHeader>

        {action && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <p className="font-medium">{action.productName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                SKU {action.sku} · {action.stock} unités en stock · Prix
                unitaire {action.unitPrice.toFixed(2)} €
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-price">
                Prix remisé (€){' '}
                {discount !== null && discount > 0 && (
                  <span className="ml-1 text-xs text-emerald-600 font-normal">
                    -{discount}%
                  </span>
                )}
              </Label>
              <Input
                id="offer-price"
                type="number"
                step="0.01"
                min="0.01"
                max={action.unitPrice}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="Ex : 12.50"
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-qty">
                Quantité à proposer{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  (max {action.stock})
                </span>
              </Label>
              <Input
                id="offer-qty"
                type="number"
                step="1"
                min="1"
                max={action.stock}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setErrors((prev) => ({ ...prev, quantity: undefined }));
                }}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
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
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
            Publier l&apos;offre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
