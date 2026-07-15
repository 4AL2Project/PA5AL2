'use client';

// Édition des créneaux hebdo de récupération des dons : ce sont ces fenêtres
// que les associations voient au moment de choisir leur créneau de retrait.

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PickupWindow {
  day: string;
  start: string;
  end: string;
}

const DAYS: { value: string; label: string }[] = [
  { value: 'MON', label: 'Lundi' },
  { value: 'TUE', label: 'Mardi' },
  { value: 'WED', label: 'Mercredi' },
  { value: 'THU', label: 'Jeudi' },
  { value: 'FRI', label: 'Vendredi' },
  { value: 'SAT', label: 'Samedi' },
  { value: 'SUN', label: 'Dimanche' },
];

export function PickupWindowsForm({
  initial,
}: {
  initial: PickupWindow[] | null;
}) {
  const [windows, setWindows] = useState<PickupWindow[]>(
    initial ?? [{ day: 'TUE', start: '14:00', end: '17:00' }]
  );
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: Partial<PickupWindow>) =>
    setWindows((w) =>
      w.map((win, j) => (j === i ? { ...win, ...patch } : win))
    );

  const handleSave = async () => {
    for (const w of windows) {
      if (w.start >= w.end) {
        toast.error('Chaque créneau doit finir après son début');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/be/api/pharmacies/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_pickup_windows: windows }),
      });
      if (!res.ok) throw new Error();
      toast.success('Créneaux de récupération enregistrés');
    } catch {
      toast.error("Impossible d'enregistrer les créneaux");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-semibold">
        Créneaux de récupération des dons
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Les associations choisissent leur créneau de retrait parmi ces fenêtres
        hebdomadaires.
      </p>

      <div className="mt-4 space-y-2">
        {windows.map((w, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Select value={w.day} onValueChange={(day) => update(i, { day })}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              className="w-28"
              value={w.start}
              onChange={(e) => update(i, { start: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="time"
              className="w-28"
              value={w.end}
              onChange={(e) => update(i, { end: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={windows.length <= 1}
              onClick={() => setWindows((arr) => arr.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setWindows((arr) => [
              ...arr,
              { day: 'THU', start: '14:00', end: '17:00' },
            ])
          }
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un créneau
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
