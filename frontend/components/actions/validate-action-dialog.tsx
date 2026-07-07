'use client';

import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CategoryMultiSelect } from '@/components/categories/category-multi-select';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fetchCategories } from '@/lib/api';
import { Category, DormantAction } from '@/lib/types';

export interface ValidateActionPayload {
  type: DormantAction['type'];
  discountedPrice?: number;
  quantityOffered?: number;
  description?: string;
  categoryIds?: string[];
}

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
    description: 'Publier une offre de revente sur le catalogue client',
  },
];

interface ValidateActionDialogProps {
  action: DormantAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, payload: ValidateActionPayload) => void;
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
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<{ price?: string; quantity?: string }>(
    {}
  );

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (open && action) {
      setSelectedType(action.type);
      setPrice(action.unitPrice.toFixed(2));
      setQuantity(String(action.stock));
      setDescription('');
      setCategoryIds([]);
      setErrors({});
    }
  }, [open, action]);

  const validate = (): ValidateActionPayload | null => {
    if (selectedType !== 'B2C') return { type: 'DON' };

    const errs: typeof errors = {};
    const p = parseFloat(price);
    const q = parseInt(quantity, 10);

    if (isNaN(p) || p <= 0) errs.price = 'Prix invalide (doit être > 0)';
    else if (action && p > action.unitPrice)
      errs.price = `Doit être ≤ prix unitaire (${action.unitPrice.toFixed(2)} €)`;

    if (isNaN(q) || q <= 0) errs.quantity = 'Quantité invalide (doit être > 0)';
    else if (action && q > action.stock)
      errs.quantity = `Maximum : ${action.stock} unités`;

    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;
    return {
      type: 'B2C',
      discountedPrice: p,
      quantityOffered: q,
      description: description.trim() || undefined,
      categoryIds,
    };
  };

  const handleConfirm = () => {
    if (!action) return;
    const payload = validate();
    if (!payload) return;
    onConfirm(action.id, payload);
  };

  const discount =
    action && selectedType === 'B2C' && parseFloat(price) > 0
      ? Math.round((1 - parseFloat(price) / action.unitPrice) * 100)
      : null;

  const selected = ACTION_OPTIONS.find((o) => o.value === selectedType);

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-none sm:max-w-md">
        <div className="flex flex-col h-full overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Gérer ce produit</DrawerTitle>
          </DrawerHeader>

          {action && (
            <div className="space-y-4 px-4 pb-2 flex-1">
              {/* Product summary */}
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                <p className="font-medium">{action.productName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.daysOfCover > 9999
                    ? '∞ j. de couverture'
                    : `${Math.round(action.daysOfCover)} j. de couverture`}
                  {action.capitalLocked != null && (
                    <>
                      {' · '}
                      {action.capitalLocked.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0,
                      })}{' '}
                      immobilisés
                    </>
                  )}
                </p>
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <Label>Action à effectuer</Label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v as DormantAction['type']);
                    setErrors({});
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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

              {/* B2C fields */}
              {selectedType === 'B2C' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="offer-price">
                      Prix remisé (€)
                      {discount !== null && discount > 0 && (
                        <span className="ml-2 text-xs text-emerald-600 font-normal">
                          -{discount}%
                        </span>
                      )}
                    </Label>
                    {/* Quick discount buttons */}
                    <div className="flex gap-1.5">
                      {[10, 30, 50, 70].map((pct) => {
                        const discountedPrice =
                          action.unitPrice * (1 - pct / 100);
                        const isActive = discount === pct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setPrice(discountedPrice.toFixed(2));
                              setErrors((prev) => ({
                                ...prev,
                                price: undefined,
                              }));
                            }}
                            className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            }`}
                          >
                            -{pct}%
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      id="offer-price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        setErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                      placeholder={`Max ${action.unitPrice.toFixed(2)} €`}
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
                      <p className="text-xs text-destructive">
                        {errors.quantity}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Catégories{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        (optionnel — « Autres » par défaut)
                      </span>
                    </Label>
                    <CategoryMultiSelect
                      categories={categories}
                      value={categoryIds}
                      onChange={setCategoryIds}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="offer-description">
                      Description{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        (optionnel)
                      </span>
                    </Label>
                    <Textarea
                      id="offer-description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez l'offre pour le catalogue client…"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DrawerFooter className="flex-col gap-2 mt-auto">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full"
            >
              Valider
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  if (action) {
                    onSnooze(action.id);
                  }
                }}
                disabled={loading}
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Reporter 48 h
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
