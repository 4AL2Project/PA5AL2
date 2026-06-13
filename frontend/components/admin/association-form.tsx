'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Association } from '@/lib/admin';

const CATEGORY_OPTIONS = [
  'medicaments',
  'cosmetiques',
  'parapharmacie',
  'materiel_medical',
  'autre',
];

interface AssociationFormProps {
  initial?: Association;
  onCancel: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  contact_email: string;
  contact_phone: string;
  categories: string[];
}

function emptyForm(): FormState {
  return {
    name: '',
    address: '',
    city: '',
    postal_code: '',
    contact_email: '',
    contact_phone: '',
    categories: [],
  };
}

function fromAssociation(a: Association): FormState {
  return {
    name: a.name,
    address: a.address,
    city: a.city,
    postal_code: a.postal_code,
    contact_email: a.contact_email ?? '',
    contact_phone: a.contact_phone ?? '',
    categories: a.categories,
  };
}

export function AssociationForm({
  initial,
  onCancel,
  onSaved,
}: AssociationFormProps) {
  const [form, setForm] = useState<FormState>(
    initial ? fromAssociation(initial) : emptyForm()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
        categories: form.categories,
      };

      const isEdit = !!initial;
      const url = isEdit
        ? `/api/be/api/associations/${initial!.association_id}`
        : '/api/be/api/associations';

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setError('Une erreur est survenue. Vérifiez votre saisie.');
        return;
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    form.name.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.postal_code.trim() &&
    form.categories.length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="asso-name" className="text-xs">
          Nom de l&apos;association *
        </Label>
        <Input
          id="asso-name"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          disabled={submitting}
          placeholder="Croix Bleue Paris"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="asso-address" className="text-xs">
          Adresse *
        </Label>
        <Input
          id="asso-address"
          required
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          disabled={submitting}
          placeholder="1 rue de la Paix"
        />
        <p className="text-[11px] text-muted-foreground">
          Les coordonnées GPS seront calculées automatiquement.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 space-y-1.5">
          <Label htmlFor="asso-cp" className="text-xs">
            Code postal *
          </Label>
          <Input
            id="asso-cp"
            required
            value={form.postal_code}
            onChange={(e) => update('postal_code', e.target.value)}
            disabled={submitting}
            placeholder="75001"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="asso-city" className="text-xs">
            Ville *
          </Label>
          <Input
            id="asso-city"
            required
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            disabled={submitting}
            placeholder="Paris"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Catégories acceptées *</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const selected = form.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {form.categories.length === 0 && (
          <p className="text-[11px] text-destructive">
            Sélectionnez au moins une catégorie.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="asso-email" className="text-xs">
          Email de contact
        </Label>
        <Input
          id="asso-email"
          type="email"
          value={form.contact_email}
          onChange={(e) => update('contact_email', e.target.value)}
          disabled={submitting}
          placeholder="contact@association.fr"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="asso-phone" className="text-xs">
          Téléphone
        </Label>
        <Input
          id="asso-phone"
          type="tel"
          value={form.contact_phone}
          onChange={(e) => update('contact_phone', e.target.value)}
          disabled={submitting}
          placeholder="01 23 45 67 89"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting || !canSubmit}>
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {initial ? 'Enregistrer' : "Créer l'association"}
        </Button>
      </div>
    </form>
  );
}
