'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { isValidEmail } from '@/lib/validation';

type EmailInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'onChange' | 'type' | 'value'
> & {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string;
};

/**
 * Champ email : valide le format à la saisie et signale une adresse invalide
 * après le premier blur (n'affiche rien tant que vide).
 */
export function EmailInput({
  value,
  onChange,
  onBlur,
  errorMessage = 'Adresse email invalide.',
  autoComplete,
  ...props
}: EmailInputProps) {
  const [touched, setTouched] = React.useState(false);
  const showError = touched && value.trim() !== '' && !isValidEmail(value);

  return (
    <>
      <Input
        {...props}
        type="email"
        inputMode="email"
        autoComplete={autoComplete ?? 'email'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
