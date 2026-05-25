'use client';

import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        title="Vérifiez votre boîte mail"
        description={`Si un compte existe pour ${email}, un lien de connexion vient d’être envoyé. Il est valable 15 minutes.`}
      >
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-risk-low mt-0.5" />
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
          className="mt-5 w-full"
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
      title="Connexion"
      description="Recevez un lien magique pour accéder à votre espace."
      footer={
        <>
          Vous êtes administrateur Savely ?{' '}
          <Link href="/admin/login" className="text-primary hover:underline">
            Accéder au back-office
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">
            Adresse email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@officine.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
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
          disabled={status === 'submitting' || !email}
        >
          {status === 'submitting' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          Recevoir un lien de connexion
        </Button>
      </form>
    </AuthShell>
  );
}
