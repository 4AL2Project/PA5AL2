'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { saveToken, verifyAssoToken } from '@/lib/api';

type State = 'loading' | 'success' | 'expired' | 'invalid' | 'no_token';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('no_token');
      return;
    }

    const redirect = searchParams.get('redirect') ?? '/offres';

    verifyAssoToken(token)
      .then(({ access_token, is_onboarded }) => {
        saveToken(access_token);
        setState('success');
        setTimeout(
          () => router.replace(is_onboarded ? redirect : '/auth/setup'),
          800
        );
      })
      .catch((err: Error) => {
        setState(
          err.message?.toLowerCase().includes('expir') ? 'expired' : 'invalid'
        );
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-xl font-bold text-foreground">Savely</span>
        </div>

        {state === 'loading' && (
          <div className="rounded-2xl border border-border bg-card p-10">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-medium text-foreground">Connexion en cours…</p>
          </div>
        )}

        {state === 'success' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-5 w-5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="font-semibold text-foreground">Connexion réussie !</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Redirection en cours…
            </p>
          </div>
        )}

        {state === 'expired' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-5 w-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="font-semibold text-foreground">Ce lien a expiré</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contactez l'équipe Savely pour recevoir un nouveau lien d'accès.
            </p>
          </div>
        )}

        {(state === 'invalid' || state === 'no_token') && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="h-5 w-5 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="font-semibold text-foreground">Lien invalide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ce lien n'est pas valide. Contactez l'équipe Savely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
