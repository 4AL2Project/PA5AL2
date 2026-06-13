'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminLogin, decodeJwt, startSession } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await adminLogin(email, password);
      const claims = decodeJwt(tokens.access_token);
      if (claims?.role !== 'ADMIN_SAVELY') {
        setError('Accès réservé aux administrateurs Savely.');
        return;
      }
      await startSession(tokens);
      router.replace('/admin');
    } catch (err) {
      const message =
        (err as { status?: number }).status === 401
          ? 'Email ou mot de passe incorrect.'
          : 'Connexion impossible pour le moment.';
      setError(message);
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
        <Input
          id="admin-email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="h-11 rounded-2xl border-none bg-[rgba(64,64,64,0.08)] px-6 text-sm placeholder:text-[#C0C3C3] focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="relative">
          <Input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="h-11 rounded-2xl border-none bg-[rgba(64,64,64,0.08)] px-6 pr-12 text-sm placeholder:text-[#C0C3C3] focus-visible:ring-0 focus-visible:ring-offset-0"
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
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={submitting || !email || !password}
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
