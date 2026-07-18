'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { AddressSuggestion, Coords, searchAddresses } from '@/lib/address';

interface AddressAutocompleteProps {
  id?: string;
  name?: string;
  value: string;
  /**
   * Notifié à chaque changement de valeur. `coords` est renseigné quand la
   * valeur provient d'une suggestion choisie, sinon `null` (saisie libre).
   */
  onChange: (value: string, coords: Coords | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Champ adresse avec autocomplétion via la Base Adresse Nationale (API de l'État).
 * Le bandeau de suggestions ne s'affiche que lorsque le champ est actif.
 */
export function AddressAutocomplete({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  // Dernière valeur issue d'une sélection : évite de relancer une recherche
  // (et de rouvrir le bandeau) sur une adresse déjà choisie.
  const lastPickedRef = useRef<string | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (!open || q.length < 3 || q === lastPickedRef.current) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setSuggestions(await searchAddresses(q, controller.signal));
      } catch {
        // requête annulée ou réseau indisponible — on ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value, open]);

  const pick = (s: AddressSuggestion) => {
    lastPickedRef.current = s.label;
    setSuggestions([]);
    setOpen(false);
    onChange(s.label, s.coords);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          lastPickedRef.current = null;
          setOpen(true);
          onChange(e.target.value, null);
        }}
      />
      {searching && (
        <Loader2 className="absolute right-2.5 top-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-md border bg-card shadow-md">
          {suggestions.map((s) => (
            <li key={s.label} className="border-b last:border-b-0">
              <button
                type="button"
                // onMouseDown : sélection avant le blur du champ.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className="w-full px-3 py-2 text-left hover:bg-muted/50"
              >
                <span className="block text-xs font-medium">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
