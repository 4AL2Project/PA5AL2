'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminLogin, decodeJwt, startSession } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailValid = isValidEmail(email);
  const passwordValid = password.length > 0;
  const emailError = emailTouched && !emailValid && !emailFocused;
  const passwordError = passwordTouched && !passwordValid && !passwordFocused;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const tokens = await adminLogin(email, password);
      const claims = decodeJwt(tokens.access_token);
      if (claims?.role !== 'ADMIN_SAVELY') {
        setServerError('Accès réservé aux administrateurs Savely.');
        return;
      }
      await startSession(tokens);
      router.replace('/admin');
    } catch (err) {
      const message =
        (err as { status?: number }).status === 401
          ? 'Email ou mot de passe incorrect.'
          : 'Connexion impossible pour le moment.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      split={{ title: 'Connection', subtitle: 'Espace\nAdmin' }}
      title="Connection"
      description="Connecter vous pour gérer des officines"
      footer={
        <>
          Vous êtes titulaire d&apos;une officine ?{' '}
          <Link href="/login" className="font-bold text-[#0F766E]">
            Connectez-vous ici
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Input
            id="admin-email"
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
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => {
                setPasswordTouched(true);
                setPasswordFocused(false);
              }}
              disabled={submitting}
              aria-invalid={passwordError}
              className="h-11 rounded-2xl border border-transparent bg-[rgba(64,64,64,0.08)] px-6 pr-12 text-sm placeholder:text-[#C0C3C3] aria-invalid:border-destructive aria-invalid:bg-destructive/5"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C0C3C3] hover:text-[#6B7280]"
              tabIndex={-1}
              aria-label={
                showPassword
                  ? 'Masquer le mot de passe'
                  : 'Afficher le mot de passe'
              }
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-destructive pl-1" role="alert">
              Le mot de passe est requis
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
          disabled={submitting || !emailValid || !passwordValid}
          className="mt-2 w-full h-[34px] rounded-[14px] bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0d6560] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
