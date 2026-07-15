'use client';

// Landing publique : auto-inscription des associations bénéficiaires.
// Honeypot (champ `website` caché) + rate limit par IP côté backend ;
// le géocodage est confirmé côté serveur.

import { CheckCircle2, Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DONATION_CATEGORIES } from '@/lib/donation-categories';

interface FormState {
  name: string;
  rna_or_siren: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  postal_code: string;
  city: string;
  action_radius_km: number;
  categories: string[];
  pickup_sla_days: number;
  website: string; // honeypot — doit rester vide
}

const INITIAL: FormState = {
  name: '',
  rna_or_siren: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  postal_code: '',
  city: '',
  action_radius_km: 30,
  categories: [],
  pickup_sla_days: 7,
  website: '',
};

export default function AssociationsLandingPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [logo, setLogo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (cat: string) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.categories.length === 0) {
      setError('Sélectionnez au moins une catégorie de produits');
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.set('name', form.name);
      body.set('rna_or_siren', form.rna_or_siren);
      body.set('contact_email', form.contact_email);
      body.set('contact_phone', form.contact_phone);
      body.set('address', form.address);
      body.set('postal_code', form.postal_code);
      body.set('city', form.city);
      body.set('action_radius_km', String(form.action_radius_km));
      form.categories.forEach((c) => body.append('categories', c));
      body.set('pickup_sla_days', String(form.pickup_sla_days));
      body.set('website', form.website);
      if (logo) body.set('logo', logo);

      const res = await fetch('/api/be/api/public/associations/register', {
        method: 'POST',
        body,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          payload?.error?.message ??
            "L'inscription a échoué — vérifiez vos informations"
        );
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Heart className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">
            Savely — Dons solidaires
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">
            Recevez des dons de produits des pharmacies de votre zone
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Savely met en relation les officines et les associations : les
            produits invendus (parapharmacie, cosmétique, hygiène) vous sont
            proposés directement par email — sans compte à gérer. Vous acceptez
            ce qui vous intéresse, choisissez un créneau, et venez récupérer le
            lot à l&apos;officine.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <h2 className="text-lg font-semibold">Demande envoyée</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Confirmez votre adresse email via le lien que nous venons de vous
              envoyer (valable 48 h). Notre équipe examinera ensuite votre
              demande.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border bg-card p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="asso-name">Nom de l&apos;association *</Label>
                <Input
                  id="asso-name"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asso-rna">RNA ou SIREN *</Label>
                <Input
                  id="asso-rna"
                  required
                  maxLength={20}
                  placeholder="W123456789 ou 123456789"
                  value={form.rna_or_siren}
                  onChange={(e) => set('rna_or_siren', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asso-phone">Téléphone *</Label>
                <Input
                  id="asso-phone"
                  required
                  type="tel"
                  maxLength={20}
                  value={form.contact_phone}
                  onChange={(e) => set('contact_phone', e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="asso-email">Email de contact *</Label>
                <Input
                  id="asso-email"
                  required
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set('contact_email', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Les propositions de dons arriveront sur cette adresse.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="asso-address">
                  Adresse du siège (domiciliation) *
                </Label>
                <AddressAutocomplete
                  id="asso-address"
                  required
                  value={form.address}
                  onChange={(value) => set('address', value)}
                  placeholder="12 rue des Lilas…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asso-cp">Code postal *</Label>
                <Input
                  id="asso-cp"
                  required
                  maxLength={10}
                  value={form.postal_code}
                  onChange={(e) => set('postal_code', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asso-city">Ville *</Label>
                <Input
                  id="asso-city"
                  required
                  maxLength={100}
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rayon d&apos;action : {form.action_radius_km} km</Label>
              <Slider
                min={5}
                max={100}
                step={5}
                value={[form.action_radius_km]}
                onValueChange={([v]) => set('action_radius_km', v)}
              />
              <p className="text-xs text-muted-foreground">
                Distance maximale de déplacement de vos bénévoles autour de
                votre siège. Vous ne recevrez que les propositions des officines
                dans cette zone.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Catégories de produits acceptées *</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DONATION_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={form.categories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="asso-sla">Délai de récupération (jours)</Label>
                <Input
                  id="asso-sla"
                  type="number"
                  min={1}
                  max={30}
                  value={form.pickup_sla_days}
                  onChange={(e) =>
                    set('pickup_sla_days', parseInt(e.target.value, 10) || 7)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Délai maximum entre votre acceptation et le retrait du lot.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asso-logo">Logo (optionnel)</Label>
                <Input
                  id="asso-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Honeypot anti-bot : caché aux humains, rempli par les robots */}
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="asso-website">Site web</Label>
              <Input
                id="asso-website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer ma demande d&apos;inscription
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
