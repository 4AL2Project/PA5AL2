'use client';

// Panneau d'édition d'une association depuis sa fiche annuaire (titulaire) :
// coordonnées, catégories acceptées, créneaux de passage (V1 statiques).

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AssociationFiche,
  AssociationWindow,
  updateAssociation,
} from '@/lib/api';
import { DONATION_CATEGORIES } from '@/lib/donation-categories';
import { DAY_OPTIONS } from '@/lib/pickup-windows';

export function AssociationEditDrawer({
  fiche,
  open,
  onOpenChange,
  onSaved,
}: {
  fiche: AssociationFiche;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(fiche.name);
  const [address, setAddress] = useState(fiche.address);
  const [phone, setPhone] = useState(fiche.contact_phone ?? '');
  const [email, setEmail] = useState(fiche.contact_email ?? '');
  const [categories, setCategories] = useState<string[]>(fiche.categories);
  const [windows, setWindows] = useState<AssociationWindow[]>(
    fiche.pickup_windows ?? []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(fiche.name);
      setAddress(fiche.address);
      setPhone(fiche.contact_phone ?? '');
      setEmail(fiche.contact_email ?? '');
      setCategories(fiche.categories);
      setWindows(fiche.pickup_windows ?? []);
    }
  }, [open, fiche]);

  const toggleCategory = (cat: string) =>
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const updateWindow = (i: number, patch: Partial<AssociationWindow>) =>
    setWindows((w) =>
      w.map((win, j) => (j === i ? { ...win, ...patch } : win))
    );

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || categories.length === 0) {
      toast.error('Nom, adresse et au moins une catégorie sont requis');
      return;
    }
    for (const w of windows) {
      if (w.start >= w.end) {
        toast.error('Chaque créneau doit finir après son début');
        return;
      }
    }
    setSaving(true);
    try {
      await updateAssociation(fiche.association_id, {
        name: name.trim(),
        address: address.trim(),
        contact_phone: phone.trim() || undefined,
        contact_email: email.trim() || undefined,
        categories,
        pickup_windows: windows,
      });
      toast.success('Association mise à jour');
      onSaved();
    } catch {
      toast.error("Impossible d'enregistrer les modifications");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">
            Modifier l&apos;association
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nom *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-address">Adresse *</Label>
            <Input
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Téléphone</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Catégories acceptées *</Label>
            <div className="grid grid-cols-2 gap-2">
              {DONATION_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Créneaux de passage (V1 statiques)</Label>
            {windows.map((w, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Select
                  value={w.day}
                  onValueChange={(day) => updateWindow(i, { day })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  className="w-26"
                  value={w.start}
                  onChange={(e) => updateWindow(i, { start: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="time"
                  className="w-26"
                  value={w.end}
                  onChange={(e) => updateWindow(i, { end: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setWindows((arr) => arr.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setWindows((arr) => [
                  ...arr,
                  { day: 'MON', start: '09:00', end: '17:00' },
                ])
              }
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un créneau
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Ces créneaux sont croisés avec les fenêtres de récupération de
              votre officine au moment de planifier un retrait.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
