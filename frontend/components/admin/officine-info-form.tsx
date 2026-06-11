'use client';

import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PharmacyDetail } from '@/lib/auth';

interface InfoFormState {
  name: string;
  siret: string;
  address: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

function initialState(p: PharmacyDetail): InfoFormState {
  return {
    name: p.name ?? '',
    siret: p.siret ?? '',
    address: p.address ?? '',
    first_name: p.titulaire?.first_name ?? '',
    last_name: p.titulaire?.last_name ?? '',
    email: p.titulaire?.email ?? '',
    phone: p.titulaire?.phone ?? '',
  };
}

export function OfficineInfoForm({ pharmacy }: { pharmacy: PharmacyDetail }) {
  const router = useRouter();
  const [initial, setInitial] = useState<InfoFormState>(() =>
    initialState(pharmacy)
  );
  const [form, setForm] = useState<InfoFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const hasTitulaire = pharmacy.titulaire !== null;
  const isPending = pharmacy.titulaire?.status !== 'ACTIVE' && hasTitulaire;

  const update = <K extends keyof InfoFormState>(
    key: K,
    value: InfoFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const dirty = (Object.keys(form) as (keyof InfoFormState)[]).some(
    (k) => form[k] !== initial[k]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        pharmacy: {
          name: form.name,
          siret: form.siret,
          address: form.address,
        },
      };
      if (hasTitulaire) {
        body.titulaire = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
        };
      }
      const res = await fetch(`/api/admin/pharmacies/${pharmacy.pharmacy_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setError('Cet email est déjà associé à un compte.');
        } else if (res.status === 400) {
          setError('Certains champs sont invalides. Vérifiez votre saisie.');
        } else if (res.status === 403) {
          setError('Vous n’avez pas les droits pour cette action.');
        } else {
          setError('Impossible d’enregistrer les modifications.');
        }
        return;
      }
      setInitial(form);
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const onResend = async () => {
    setResendError(null);
    setResent(false);
    setResending(true);
    try {
      const res = await fetch(
        `/api/admin/pharmacies/${pharmacy.pharmacy_id}/resend-invitation`,
        { method: 'POST' }
      );
      if (!res.ok) {
        setResendError('Impossible de renvoyer l’invitation.');
        return;
      }
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-10">
      <section className="space-y-5">
        <h2 className="text-base font-semibold">Générale</h2>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nom de l’officine</Label>
          <Input
            id="name"
            value={form.name}
            placeholder="Pharmacie de Paris"
            onChange={(e) => update('name', e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="siret">SIRET</Label>
          <Input
            id="siret"
            value={form.siret}
            inputMode="numeric"
            placeholder="12345678901234"
            onChange={(e) => update('siret', e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={form.address}
            placeholder="12 Rue de Paris 75001"
            onChange={(e) => update('address', e.target.value)}
            disabled={saving}
          />
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Gérant</h2>
          {isPending && (
            <div className="flex items-center gap-2">
              {resent ? (
                <span className="flex items-center gap-1 text-xs text-risk-low">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Invitation renvoyée
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onResend}
                  disabled={resending}
                >
                  {resending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Renvoyer l’invitation
                </Button>
              )}
            </div>
          )}
        </div>
        {resendError && (
          <p className="text-xs text-destructive" role="alert">
            {resendError}
          </p>
        )}

        {hasTitulaire ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  placeholder="Dupont"
                  onChange={(e) => update('last_name', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  placeholder="Jean"
                  onChange={(e) => update('first_name', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  placeholder="email@savely.com"
                  onChange={(e) => update('email', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  placeholder="0712345678"
                  onChange={(e) => update('phone', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun gérant rattaché à cette officine.
          </p>
        )}
      </section>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-xs text-risk-low">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Enregistré
          </span>
        )}
        <Button type="submit" disabled={saving || !dirty}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
