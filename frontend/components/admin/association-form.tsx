'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Button } from '@/components/ui/button';
import { EmailInput } from '@/components/ui/email-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Association } from '@/lib/admin';
import { isValidEmail, isValidFrenchPhone } from '@/lib/validation';

const CATEGORY_OPTIONS = [
  'medicaments',
  'cosmetiques',
  'parapharmacie',
  'materiel_medical',
  'autre',
];

const ALLOWED_LOGO_TYPES = /^image\/(jpe?g|png|webp|gif|svg\+xml)$/;
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 Mo

// Résout un logo (chemin relatif servi par le backend) en URL same-origin
// passant par le proxy `/api/be`.
function resolveLogoUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `/api/be${path}`;
}

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
  action_radius_km: number;
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
    action_radius_km: 30,
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
    action_radius_km: a.action_radius_km ?? 30,
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    resolveLogoUrl(initial?.logo_url ?? null)
  );
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const acceptLogo = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.test(file.type)) {
      setError('Format de logo non supporté (jpeg, png, webp, gif, svg).');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Le logo dépasse la taille maximale de 5 Mo.');
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    acceptLogo(e.dataTransfer.files?.[0]);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        action_radius_km: form.action_radius_km,
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

      if (logoFile) {
        const payload = await res.json().catch(() => null);
        const associationId: string | undefined = isEdit
          ? initial!.association_id
          : (payload?.data?.association_id ?? payload?.association_id);
        if (associationId) {
          const logoForm = new FormData();
          logoForm.append('logo', logoFile);
          const logoRes = await fetch(
            `/api/be/api/associations/${associationId}/logo`,
            { method: 'POST', body: logoForm }
          );
          if (!logoRes.ok) {
            setError(
              "L'association a été enregistrée mais le logo n'a pas pu être téléversé."
            );
            return;
          }
        }
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
    form.categories.length > 0 &&
    (form.contact_email.trim() === '' || isValidEmail(form.contact_email)) &&
    (form.contact_phone.trim() === '' ||
      isValidFrenchPhone(form.contact_phone));

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
        <Label className="text-xs">Logo (optionnel)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => acceptLogo(e.target.files?.[0])}
          disabled={submitting}
        />
        {logoPreview ? (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <img
              src={logoPreview}
              alt="Logo de l'association"
              className="h-14 w-14 rounded-md object-contain"
            />
            <div className="flex flex-1 items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                Remplacer
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={removeLogo}
                disabled={submitting}
                aria-label="Retirer le logo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Glissez-déposez une image ou{' '}
              <span className="text-primary">parcourez</span>
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              PNG, JPG, WEBP, SVG — 5 Mo max
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="asso-address" className="text-xs">
          Adresse *
        </Label>
        <AddressAutocomplete
          id="asso-address"
          required
          value={form.address}
          onChange={(value) => update('address', value)}
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

      <div className="space-y-1.5">
        <Label htmlFor="asso-radius" className="text-xs">
          Rayon d'action (km) *
        </Label>
        <Input
          id="asso-radius"
          type="number"
          required
          min={5}
          max={100}
          value={form.action_radius_km}
          onChange={(e) =>
            update('action_radius_km', parseInt(e.target.value, 10) || 30)
          }
          disabled={submitting}
        />
        <p className="text-[11px] text-muted-foreground">
          Zone d'action réelle autour du siège — pilote l'éligibilité au
          matching (5 à 100 km).
        </p>
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
        <EmailInput
          id="asso-email"
          value={form.contact_email}
          onChange={(value) => update('contact_email', value)}
          disabled={submitting}
          placeholder="contact@association.fr"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="asso-phone" className="text-xs">
          Téléphone
        </Label>
        <PhoneInput
          id="asso-phone"
          value={form.contact_phone}
          onChange={(value) => update('contact_phone', value)}
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
