'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestMagicLink } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('submitting');
    try {
      await requestMagicLink(email);
      setStatus('sent');
    } catch {
      setError(
        'Impossible d’envoyer le lien pour le moment. Réessayez dans un instant.'
      );
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <AuthShell
        split={{ title: 'Connexion', subtitle: 'Espace\nTitulaire' }}
        title="Vérifiez votre boîte mail"
        description={`Si un compte existe pour ${email}, un lien de connexion vient d'être envoyé. Il est valable 15 minutes.`}
        footer={
          <>
            Vous êtes admin ?{' '}
            <Link href="/admin/login" className="font-bold text-[#0F766E]">
              Connectez-vous ici
            </Link>
          </>
        }
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
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStatus('idle');
            setEmail('');
          }}
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
      footer={
        <>
          Vous êtes admin ?{' '}
          <Link href="/admin/login" className="font-bold text-[#0F766E]">
            Connectez-vous ici
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
          className="h-11 rounded-2xl border-none bg-[rgba(64,64,64,0.08)] px-6 text-sm placeholder:text-[#C0C3C3] focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={status === 'submitting' || !email}
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
