'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  decodeJwt,
  landingPathForRole,
  requestPreparateurCode,
  startSession,
  verifyPreparateurCode,
} from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function PreparateurLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailValid = isValidEmail(email);
  const emailError = emailTouched && !emailValid && !emailFocused;
  const codeValid = new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const onRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    setServerError(null);
    setSubmitting(true);
    try {
      await requestPreparateurCode(email);
      setStep('code');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setServerError(
        "Impossible d'envoyer le code pour le moment. Réessayez dans un instant."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resending || resendCooldown > 0) return;
    setServerError(null);
    setResending(true);
    try {
      await requestPreparateurCode(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setServerError('Impossible de renvoyer le code pour le moment.');
    } finally {
      setResending(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeValid) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const tokens = await verifyPreparateurCode(email, code);
      await startSession(tokens);
      const claims = decodeJwt(tokens.access_token);
      router.replace(claims ? landingPathForRole(claims.role) : '/');
    } catch (err) {
      const status = (err as { status?: number }).status;
      setServerError(
        status === 401
          ? 'Code invalide ou expiré. Demandez-en un nouveau.'
          : 'Connexion impossible pour le moment.'
      );
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      Vous êtes titulaire d&apos;une officine ?{' '}
      <Link href="/login" className="font-bold text-[#0F766E]">
        Connectez-vous ici
      </Link>
    </>
  );

  if (step === 'code') {
    return (
      <AuthShell
        split={{ title: 'Connexion', subtitle: 'Espace\nPréparateur' }}
        title="Entrez votre code"
        description={`Si un compte existe pour ${email}, un code à ${CODE_LENGTH} chiffres vient d'être envoyé. Il est valable 10 minutes.`}
        footer={footer}
      >
        <form onSubmit={onVerifyCode} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
              }
              disabled={submitting}
              autoFocus
              className="h-11 rounded-2xl border border-transparent bg-[rgba(64,64,64,0.08)] px-6 text-center text-lg tracking-[0.5em] placeholder:tracking-[0.5em] placeholder:text-[#C0C3C3]"
            />
          </div>

          {serverError && (
            <p className="text-xs text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !codeValid}
            className="w-full h-[34px] rounded-[14px] bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0d6560] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Se connecter'
            )}
          </Button>

          <div className="rounded-lg border p-4 space-y-2.5">
            <div className="space-y-1 text-xs">
              <p className="font-medium text-foreground">
                Vous n’avez pas reçu le code ?
              </p>
              <p className="text-muted-foreground">
                Pensez à vérifier vos courriers indésirables.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-[34px] rounded-[14px] text-sm font-medium"
              onClick={onResend}
              disabled={resending || resendCooldown > 0}
            >
              {resending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : resendCooldown > 0 ? (
                `Renvoyer le code (${resendCooldown}s)`
              ) : (
                'Renvoyer le code'
              )}
            </Button>
            {resendCooldown === RESEND_COOLDOWN_SECONDS && !resending && (
              <p
                className="text-xs text-green-600 flex items-center gap-1.5"
                role="status"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Un nouveau code vient d’être envoyé.
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep('email');
              setCode('');
              setServerError(null);
              setResendCooldown(0);
            }}
          >
            Utiliser une autre adresse
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      split={{ title: 'Connexion', subtitle: 'Espace\nPréparateur' }}
      title="Connexion"
      description="Recevez un code à 6 chiffres pour accéder à votre espace."
      footer={footer}
    >
      <form onSubmit={onRequestCode} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => {
              setEmailTouched(true);
              setEmailFocused(false);
            }}
            disabled={submitting}
            aria-invalid={emailError}
            className="h-11 rounded-2xl border border-transparent bg-[rgba(64,64,64,0.08)] px-6 text-sm placeholder:text-[#C0C3C3] aria-invalid:border-destructive aria-invalid:bg-destructive/5"
          />
          {emailError && (
            <p className="text-xs text-destructive pl-1" role="alert">
              Adresse email invalide
            </p>
          )}
        </div>
        {serverError && (
          <p className="text-xs text-destructive" role="alert">
            {serverError}
          </p>
        )}
        <Button
          type="submit"
          disabled={submitting || !emailValid}
          className="w-full h-[34px] rounded-[14px] bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0d6560] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Recevoir un code'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
