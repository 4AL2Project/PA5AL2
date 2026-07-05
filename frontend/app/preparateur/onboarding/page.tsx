'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  acceptPreparateurInvitation,
  getInvitation,
  InvitationInfo,
} from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; status?: number }
  | { kind: 'invalid-role' }
  | { kind: 'ready'; info: InvitationInfo };

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  confirm_password: string;
  accepted_terms: boolean;
}

function buildInitialForm(info: InvitationInfo): FormState {
  return {
    first_name: info.titulaire.first_name ?? '',
    last_name: info.titulaire.last_name ?? '',
    phone: info.titulaire.phone ?? '',
    password: '',
    confirm_password: '',
    accepted_terms: false,
  };
}

function PreparateurOnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadState({ kind: 'error' });
      return;
    }
    let cancelled = false;
    getInvitation(token)
      .then((info) => {
        if (cancelled) return;
        if (info.role !== 'PREPARATEUR') {
          setLoadState({ kind: 'invalid-role' });
          return;
        }
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

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setSubmitError(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      );
      return;
    }
    if (form.password !== form.confirm_password) {
      setSubmitError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await acceptPreparateurInvitation(token, {
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone.trim() || undefined,
        accepted_terms: form.accepted_terms,
      });
      const email =
        loadState.kind === 'ready' ? loadState.info.titulaire.email : '';
      setSuccessEmail(email);
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

  if (successEmail) {
    return (
      <AuthShell
        title="Compte créé avec succès"
        description="Votre compte préparateur est prêt."
      >
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Vous pouvez désormais vous connecter sur l’application mobile Savely
            avec votre adresse email{' '}
            <span className="font-medium text-foreground">{successEmail}</span>{' '}
            et le mot de passe que vous venez de choisir.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (loadState.kind === 'error' || loadState.kind === 'invalid-role') {
    const isRoleError = loadState.kind === 'invalid-role';
    return (
      <AuthShell
        title={
          isRoleError
            ? 'Lien d’invitation incorrect'
            : 'Lien d’invitation invalide'
        }
        description={
          isRoleError
            ? 'Ce lien ne correspond pas à une invitation de préparateur.'
            : 'Ce lien n’est plus valide ou a déjà été utilisé.'
        }
      >
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3 mb-5">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {isRoleError
              ? 'Vérifiez le lien reçu par email ou contactez le titulaire de votre officine.'
              : 'Les invitations expirent au bout de 48 heures. Demandez au titulaire de votre officine de vous renvoyer une invitation.'}
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
    !!form.first_name.trim() &&
    !!form.last_name.trim() &&
    !!form.password &&
    !!form.confirm_password;

  return (
    <AuthShell
      title="Finaliser votre compte préparateur"
      description={`Rejoignez ${loadState.info.pharmacy.name} en choisissant votre mot de passe.`}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vos informations
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
              Téléphone{' '}
              <span className="text-muted-foreground">(facultatif)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              disabled={submitting}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Mot de passe
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Au moins {MIN_PASSWORD_LENGTH} caractères.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs">
              Confirmer le mot de passe
            </Label>
            <Input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={(e) => update('confirm_password', e.target.value)}
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

export default function PreparateurOnboardingPage() {
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
      <PreparateurOnboardingContent />
    </Suspense>
  );
}
