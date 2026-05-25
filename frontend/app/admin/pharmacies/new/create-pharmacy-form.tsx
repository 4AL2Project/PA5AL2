'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreatePharmacyResponse } from '@/lib/auth';

interface FormState {
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_siret: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

const INITIAL: FormState = {
  pharmacy_name: '',
  pharmacy_address: '',
  pharmacy_siret: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
};

export function CreatePharmacyForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreatePharmacyResponse | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy: {
            name: form.pharmacy_name,
            address: form.pharmacy_address,
            siret: form.pharmacy_siret,
          },
          titulaire: {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            phone: form.phone,
          },
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const envMessage =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          payload.error &&
          typeof payload.error === 'object' &&
          'message' in payload.error
            ? String((payload.error as { message: string }).message)
            : '';
        if (res.status === 409 || envMessage.toLowerCase().includes('email')) {
          setError('Cet email est déjà associé à un compte.');
        } else if (res.status === 400) {
          setError('Certains champs sont invalides. Vérifiez votre saisie.');
        } else if (res.status === 403) {
          setError('Vous n’avez pas les droits pour cette action.');
        } else {
          setError('Impossible de créer l’officine pour le moment.');
        }
        return;
      }
      const data: CreatePharmacyResponse =
        payload &&
        typeof payload === 'object' &&
        'success' in payload &&
        payload.success
          ? (payload as { data: CreatePharmacyResponse }).data
          : (payload as CreatePharmacyResponse);
      setSuccess(data);
      setForm(INITIAL);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-risk-low/10">
          <CheckCircle2 className="h-5 w-5 text-risk-low" />
        </div>
        <h2 className="text-sm font-semibold">Invitation envoyée</h2>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Un email d’activation vient d’être envoyé à{' '}
          <span className="text-foreground font-medium">
            {success.titulaire_email}
          </span>
          . Le titulaire dispose de 48 heures pour finaliser son compte.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Retour à la liste</Link>
          </Button>
          <Button onClick={() => setSuccess(null)}>
            Inviter une autre officine
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = Object.values(form).every((v) => v.trim().length > 0);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border bg-card p-6 space-y-6"
    >
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Officine
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor="pharmacy-name" className="text-xs">
            Nom de la pharmacie
          </Label>
          <Input
            id="pharmacy-name"
            required
            value={form.pharmacy_name}
            onChange={(e) => update('pharmacy_name', e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pharmacy-address" className="text-xs">
            Adresse
          </Label>
          <Input
            id="pharmacy-address"
            required
            value={form.pharmacy_address}
            onChange={(e) => update('pharmacy_address', e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pharmacy-siret" className="text-xs">
            SIRET
          </Label>
          <Input
            id="pharmacy-siret"
            required
            inputMode="numeric"
            value={form.pharmacy_siret}
            onChange={(e) => update('pharmacy_siret', e.target.value)}
            disabled={submitting}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Titulaire
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name" className="text-xs">
              Prénom
            </Label>
            <Input
              id="first-name"
              required
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name" className="text-xs">
              Nom
            </Label>
            <Input
              id="last-name"
              required
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">
            Téléphone
          </Label>
          <Input
            id="phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            disabled={submitting}
          />
        </div>
      </section>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/admin">Annuler</Link>
        </Button>
        <Button type="submit" disabled={submitting || !canSubmit}>
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Envoyer l’invitation
        </Button>
      </div>
    </form>
  );
}
