'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { SavelyLogo } from '@/components/savely-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestAssoMagicLink } from '@/lib/api';

type State = 'idle' | 'loading' | 'sent' | 'error';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    const token = localStorage.getItem('savely_asso_token');
    if (token) router.replace('/offres');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    const redirect = searchParams.get('redirect');
    if (redirect) sessionStorage.setItem('savely_asso_redirect', redirect);
    try {
      await requestAssoMagicLink(email);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mb-8 flex items-center justify-center">
          <SavelyLogo className="h-auto w-28 text-foreground" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          {state === 'sent' ? (
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Vérifiez votre boite mail
              </h2>
              <p className="text-sm text-muted-foreground">
                Si un compte est associé à{' '}
                <span className="font-medium text-foreground">{email}</span>,
                vous recevrez un lien de connexion dans quelques instants.
              </p>
              <button
                onClick={() => {
                  setEmail('');
                  setState('idle');
                }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <h2 className="text-xl font-bold text-foreground">Connexion</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entrez l'email de votre association pour recevoir un lien de
                  connexion.
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="mb-1.5 text-foreground">
                  Email de contact
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@mon-association.fr"
                />
              </div>

              {state === 'error' && (
                <p className="text-sm text-destructive">
                  Une erreur est survenue. Veuillez réessayer.
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={state === 'loading' || !email}
                className="w-full"
              >
                {state === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Envoi en cours…
                  </span>
                ) : (
                  'Recevoir mon lien de connexion'
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Pas encore inscrit ?{' '}
          <a
            href={`${process.env.NEXT_PUBLIC_LANDING_URL ?? 'http://localhost:3002'}/#associations`}
            className="text-primary hover:underline"
          >
            Inscrire mon association
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
