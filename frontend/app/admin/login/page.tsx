'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminLogin, decodeJwt, startSession } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      title="Back-office Savely"
      description="Connexion réservée aux administrateurs."
      footer={
        <>
          Vous êtes titulaire d’une officine ?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Connectez-vous ici
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="admin-email" className="text-xs">
            Email
          </Label>
          <Input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-password" className="text-xs">
            Mot de passe
          </Label>
          <Input
            id="admin-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !email || !password}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          Se connecter
        </Button>
      </form>
    </AuthShell>
  );
}
