'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AddressAutocomplete } from '@/components/address-autocomplete';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  acceptInvitation,
  getInvitation,
  InvitationInfo,
  startSession,
} from '@/lib/auth';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; status?: number }
  | { kind: 'ready'; info: InvitationInfo };

interface FormState {
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_siret: string;
  first_name: string;
  last_name: string;
  phone: string;
  accepted_terms: boolean;
}

function buildInitialForm(info: InvitationInfo): FormState {
  return {
    pharmacy_name: info.pharmacy.name ?? '',
    pharmacy_address: info.pharmacy.address ?? '',
    pharmacy_siret: info.pharmacy.siret ?? '',
    first_name: info.titulaire.first_name ?? '',
    last_name: info.titulaire.last_name ?? '',
    phone: info.titulaire.phone ?? '',
    accepted_terms: false,
  };
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadState({ kind: 'error' });
      return;
    }
    let cancelled = false;
    getInvitation(token)
      .then((info) => {
        if (cancelled) return;
        setLoadState({ kind: 'ready', info });
        setForm(buildInitialForm(info));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState({
          kind: 'error',
          status: (err as { status?: number }).status,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const tokens = await acceptInvitation(token, {
        pharmacy: {
          name: form.pharmacy_name,
          address: form.pharmacy_address,
          siret: form.pharmacy_siret,
        },
        titulaire: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
        },
        accepted_terms: form.accepted_terms,
      });
      await startSession(tokens);
      router.replace('/');
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 410) {
        setLoadState({ kind: 'error', status: 410 });
      } else if (status === 400) {
        setSubmitError(
          'Certaines informations sont invalides. Vérifiez les champs requis.'
        );
      } else {
        setSubmitError('Impossible de finaliser la création pour le moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState.kind === 'loading') {
    return (
      <AuthShell title="Chargement de votre invitation">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <AuthShell
        title="Lien d’invitation invalide"
        description="Ce lien n’est plus valide ou a déjà été utilisé."
      >
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3 mb-5">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Les invitations expirent au bout de 48 heures. Contactez votre
            administrateur Savely pour qu’une nouvelle invitation vous soit
            envoyée.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </AuthShell>
    );
  }

  if (!form) return null;

  const canSubmit =
    form.accepted_terms &&
    !!form.pharmacy_name.trim() &&
    !!form.pharmacy_address.trim() &&
    !!form.pharmacy_siret.trim() &&
    !!form.first_name.trim() &&
    !!form.last_name.trim() &&
    !!form.phone.trim();

  return (
    <AuthShell
      title="Finaliser votre compte"
      description="Vérifiez les informations saisies par votre administrateur, puis confirmez."
    >
      <form onSubmit={onSubmit} className="space-y-5">
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
            <AddressAutocomplete
              id="pharmacy-address"
              required
              value={form.pharmacy_address}
              onChange={(value) => update('pharmacy_address', value)}
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
              value={loadState.info.titulaire.email}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
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

        <Separator />

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            checked={form.accepted_terms}
            onCheckedChange={(checked) =>
              update('accepted_terms', checked === true)
            }
            disabled={submitting}
            className="mt-0.5"
          />
          <label
            htmlFor="terms"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            J’accepte les{' '}
            <Link href="/legal/terms" className="text-primary hover:underline">
              conditions générales d’utilisation
            </Link>{' '}
            et la{' '}
            <Link
              href="/legal/privacy"
              className="text-primary hover:underline"
            >
              politique de confidentialité
            </Link>
            .
          </label>
        </div>

        {submitError && (
          <p className="text-xs text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !canSubmit}
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Accéder à mon espace
        </Button>
      </form>
    </AuthShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Chargement de votre invitation">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </AuthShell>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
