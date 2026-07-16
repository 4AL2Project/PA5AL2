'use client';

import {
  CalendarIcon,
  Clock,
  Plus,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface PickupSlot {
  start: string;
  end: string;
}

interface DefaultWindow {
  day: string;
  start: string;
  end: string;
}

const DAY_LABELS: Record<string, string> = {
  MON: 'Lundi',
  TUE: 'Mardi',
  WED: 'Mercredi',
  THU: 'Jeudi',
  FRI: 'Vendredi',
  SAT: 'Samedi',
  SUN: 'Dimanche',
};

interface CreneauxDonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: (slots: PickupSlot[] | undefined) => void;
  loading?: boolean;
}

function formatSlotLabel(slot: PickupSlot): string {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const dateStr = start.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const startTime = start.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = end.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} · ${startTime} – ${endTime}`;
}

export function CreneauxDonModal({
  open,
  onOpenChange,
  productName,
  onConfirm,
  loading = false,
}: CreneauxDonModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [defaultWindows, setDefaultWindows] = useState<DefaultWindow[]>([]);
  const [useDefault, setUseDefault] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!open) return;
    fetch('/api/be/api/pharmacies/me')
      .then((r) => r.json())
      .then(
        (payload: {
          success?: boolean;
          data?: { donation_pickup_windows?: DefaultWindow[] | null };
          donation_pickup_windows?: DefaultWindow[] | null;
        }) => {
          const windows =
            (payload.success
              ? payload.data?.donation_pickup_windows
              : payload.donation_pickup_windows) ?? [];
          setDefaultWindows(windows);
          setUseDefault(windows.length > 0);
        }
      )
      .catch(() => {});
  }, [open]);

  const canAddSlot =
    selectedDate !== undefined && startTime < endTime && slots.length < 5;

  function handleAddSlot() {
    if (!selectedDate || !canAddSlot) return;

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(selectedDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(eh, em, 0, 0);

    const newSlot: PickupSlot = {
      start: start.toISOString(),
      end: end.toISOString(),
    };

    const duplicate = slots.some(
      (s) => s.start === newSlot.start && s.end === newSlot.end
    );
    if (duplicate) return;

    setSlots((prev) => [...prev, newSlot]);
    setSelectedDate(undefined);
  }

  function handleRemoveSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function handleConfirm() {
    onConfirm(useDefault ? undefined : slots);
    setSlots([]);
    setSelectedDate(undefined);
    setUseDefault(false);
  }

  function handleClose() {
    onOpenChange(false);
    setSlots([]);
    setSelectedDate(undefined);
    setUseDefault(false);
  }

  const canConfirm = useDefault || slots.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-emerald-600" />
            Créneaux de récupération
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Définissez les créneaux auxquels les associations pourront venir
            récupérer <span className="font-medium">{productName}</span>.
          </p>
        </DialogHeader>

        {/* Toggle créneaux par défaut */}
        {defaultWindows.length > 0 && (
          <button
            type="button"
            onClick={() => setUseDefault((v) => !v)}
            className={cn(
              'flex items-center justify-between w-full p-3 rounded-lg border text-left transition-colors',
              useDefault
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            )}
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                Utiliser les créneaux par défaut
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vos créneaux hebdomadaires configurés dans les paramètres
              </p>
            </div>
            {useDefault ? (
              <ToggleRight className="h-7 w-7 shrink-0 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-7 w-7 shrink-0 text-gray-400" />
            )}
          </button>
        )}

        {/* Aperçu créneaux par défaut */}
        {useDefault && defaultWindows.length > 0 && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-800 mb-2">
              Créneaux hebdomadaires utilisés :
            </p>
            <ul className="space-y-1">
              {defaultWindows.map((w, i) => (
                <li key={i} className="text-xs text-emerald-700">
                  {DAY_LABELS[w.day] ?? w.day} · {w.start} – {w.end}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sélecteur de créneaux spécifiques */}
        {!useDefault && (
          <div className="grid grid-cols-2 gap-6 py-2">
            {/* Calendar + time pickers */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={{ before: today }}
                  className="border rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="start-time"
                    className="text-xs text-muted-foreground"
                  >
                    Début
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="end-time"
                    className="text-xs text-muted-foreground"
                  >
                    Fin
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
              {startTime >= endTime && (
                <p className="text-xs text-destructive">
                  L&apos;heure de fin doit être après l&apos;heure de début.
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={!canAddSlot}
                onClick={handleAddSlot}
              >
                <Plus className="h-4 w-4" />
                Ajouter ce créneau
              </Button>
              {slots.length >= 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Maximum 5 créneaux atteint.
                </p>
              )}
            </div>

            {/* Slot list */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide block">
                Créneaux sélectionnés ({slots.length}/5)
              </Label>

              {slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg text-muted-foreground text-sm gap-2">
                  <CalendarIcon className="h-8 w-8 opacity-30" />
                  <span>Aucun créneau ajouté</span>
                  <span className="text-xs opacity-70">
                    Sélectionnez une date et une plage horaire
                  </span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {slots.map((slot, i) => (
                    <li
                      key={slot.start}
                      className={cn(
                        'flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm',
                        'bg-emerald-50 border-emerald-200 text-emerald-900'
                      )}
                    >
                      <span className="font-medium">
                        {formatSlotLabel(slot)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(i)}
                        className="text-emerald-600 hover:text-red-500 transition-colors shrink-0"
                        aria-label="Supprimer ce créneau"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {slots.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Les associations partenaires verront ces créneaux sur leur
                  espace lors de la réception de la proposition de don.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {useDefault
              ? 'Confirmer le don (créneaux par défaut)'
              : `Confirmer le don${slots.length > 0 ? ` (${slots.length} créneau${slots.length > 1 ? 'x' : ''})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
