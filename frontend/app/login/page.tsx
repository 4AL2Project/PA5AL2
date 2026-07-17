'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestMagicLink } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>(
    'idle'
  );
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailValid = isValidEmail(email);
  const emailError = emailTouched && !emailValid && !emailFocused;

  // Décompte du délai avant de pouvoir renvoyer un nouveau code.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    setServerError(null);
    setStatus('submitting');
    try {
      await requestMagicLink(email);
      setStatus('sent');
    } catch {
      setServerError(
        "Impossible d'envoyer le lien pour le moment. Réessayez dans un instant."
      );
      setStatus('idle');
    }
  };

  const onResend = async () => {
    if (!emailValid || resendStatus === 'sending' || resendCooldown > 0) return;
    setServerError(null);
    setResendStatus('sending');
    try {
      await requestMagicLink(email);
      setResendStatus('sent');
      setResendCooldown(30);
    } catch {
      setServerError(
        'Impossible de renvoyer le lien pour le moment. Réessayez dans un instant.'
      );
      setResendStatus('idle');
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setEmail('');
    setEmailTouched(false);
    setEmailFocused(false);
    setResendStatus('idle');
    setResendCooldown(0);
  };

  if (status === 'sent') {
    return (
      <AuthShell
        split={{ title: 'Connexion', subtitle: 'Espace\nTitulaire' }}
        title="Vérifiez votre boîte mail"
        description={`Si un compte existe pour ${email}, un lien de connexion vient d'être envoyé. Il est valable 15 minutes.`}
      >
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-medium text-foreground">Email envoyé</p>
            <p className="text-muted-foreground">
              Pensez à vérifier vos courriers indésirables si vous ne le voyez
              pas.
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2.5">
          <div className="space-y-1 text-xs">
            <p className="font-medium text-foreground">
              Vous n’avez pas reçu le lien ?
            </p>
            <p className="text-muted-foreground">
              Cliquez ci-dessous pour recevoir un nouveau lien de connexion à la
              même adresse.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-[34px] rounded-[14px] text-sm font-medium"
            onClick={onResend}
            disabled={resendStatus === 'sending' || resendCooldown > 0}
          >
            {resendStatus === 'sending' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : resendCooldown > 0 ? (
              `Renvoyer le lien de connexion (${resendCooldown}s)`
            ) : (
              'Renvoyer le lien de connexion'
            )}
          </Button>
          {resendStatus === 'sent' && resendCooldown > 0 && (
            <p
              className="text-xs text-green-600 flex items-center gap-1.5"
              role="status"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Un nouveau lien vient d’être envoyé.
            </p>
          )}
          {serverError && (
            <p className="text-xs text-destructive" role="alert">
              {serverError}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={resetForm}
        >
          Renvoyer avec une autre adresse
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      split={{ title: 'Connexion', subtitle: 'Espace\nTitulaire' }}
      title="Connexion"
      description="Recevez un lien de connexion pour accéder à votre espace."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
            disabled={status === 'submitting'}
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
          disabled={status === 'submitting' || !emailValid}
          className="w-full h-[34px] rounded-[14px] bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0d6560] disabled:opacity-50"
        >
          {status === 'submitting' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Recevoir un lien de connexion'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
