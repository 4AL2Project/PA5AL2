'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  acceptAdminInvitation,
  getInvitation,
  InvitationInfo,
} from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; status?: number }
  | { kind: 'invalid-role' }
  | { kind: 'ready'; info: InvitationInfo };

function OnboardingForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error' });
      return;
    }
    getInvitation(token)
      .then((info) => {
        if (info.role !== 'ADMIN_SAVELY') {
          setState({ kind: 'invalid-role' });
        } else {
          setState({ kind: 'ready', info });
        }
      })
      .catch((err: unknown) => {
        const status =
          err instanceof Error && err.message.includes('410') ? 410 : undefined;
        setState({ kind: 'error', status });
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirm) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await acceptAdminInvitation(token, { password });
      setDone(true);
    } catch {
      setSubmitError('Une erreur est survenue. Le lien est peut-être expiré.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">
          {state.status === 410
            ? 'Ce lien est expiré ou déjà utilisé.'
            : "Lien d'invitation invalide."}
        </p>
        <p className="text-xs text-muted-foreground">
          Demandez à un administrateur de renvoyer l&apos;invitation.
        </p>
      </div>
    );
  }

  if (state.kind === 'invalid-role') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">
          Ce lien ne correspond pas à un compte administrateur.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Compte activé !</p>
          <p className="text-xs text-muted-foreground">
            Vous pouvez maintenant vous connecter au back-office Savely.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/login">Se connecter</Link>
        </Button>
      </div>
    );
  }

  const { info } = state;
  const passwordOk = password.length >= MIN_PASSWORD_LENGTH;
  const confirmOk = password === confirm;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Bienvenue sur Savely</h1>
          <p className="text-xs text-muted-foreground">
            Vous avez été invité(e) en tant qu&apos;administrateur. Choisissez un mot
            de passe pour activer votre compte.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs font-medium">
            {[info.titulaire.first_name, info.titulaire.last_name]
              .filter(Boolean)
              .join(' ') || info.titulaire.email}
          </p>
          <p className="text-[11px] text-muted-foreground">{info.titulaire.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">
              Mot de passe <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              className="h-9 text-xs"
              placeholder="8 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
            {password.length > 0 && !passwordOk && (
              <p className="text-[10px] text-destructive">
                Minimum {MIN_PASSWORD_LENGTH} caractères
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs">
              Confirmer <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm"
              type="password"
              className="h-9 text-xs"
              placeholder="Répétez le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {confirm.length > 0 && !confirmOk && (
              <p className="text-[10px] text-destructive">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          {submitError && (
            <p className="text-xs text-destructive">{submitError}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!passwordOk || !confirmOk || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Activer mon compte'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AdminOnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
