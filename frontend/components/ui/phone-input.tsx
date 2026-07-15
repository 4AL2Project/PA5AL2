'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { formatFrenchPhone, isValidFrenchPhone } from '@/lib/validation';

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'onChange' | 'type' | 'value'
> & {
  value: string;
  /** Reçoit la valeur déjà formatée (`06 12 34 56 78`). */
  onChange: (value: string) => void;
  errorMessage?: string;
};

/**
 * Champ téléphone : formate au format français à la frappe et signale une
 * saisie invalide après le premier blur (n'affiche rien tant que vide).
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  errorMessage = 'Numéro de téléphone français invalide.',
  placeholder,
  autoComplete,
  ...props
}: PhoneInputProps) {
  const [touched, setTouched] = React.useState(false);
  const showError =
    touched && value.trim() !== '' && !isValidFrenchPhone(value);

  return (
    <>
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete ?? 'tel'}
        placeholder={placeholder ?? '06 12 34 56 78'}
        value={value}
        onChange={(e) => onChange(formatFrenchPhone(e.target.value))}
        onBlur={(e) => {
          setTouched(true);
          onBlur?.(e);
        }}
        aria-invalid={showError || undefined}
      />
      {showError && (
        <p className="text-[11px] text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </>
  );
}
