'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { saveToken, verifyAssoToken } from '@/lib/api';

type State = 'loading' | 'success' | 'expired' | 'invalid' | 'no_token';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('no_token');
      return;
    }

    verifyAssoToken(token)
      .then(({ access_token, is_onboarded }) => {
        saveToken(access_token);
        setState('success');
        setTimeout(
          () => router.replace(is_onboarded ? '/offres' : '/auth/setup'),
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm px-6">
        {state === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-savely-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 font-medium">Connexion en cours…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="w-12 h-12 bg-savely-50 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-savely-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold">Connexion réussie !</p>
            <p className="text-gray-500 text-sm">Redirection en cours…</p>
          </>
        )}
        {state === 'expired' && (
          <>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold">Ce lien a expiré</p>
            <p className="text-gray-500 text-sm">
              Contactez l'équipe Savely pour recevoir un nouveau lien.
            </p>
          </>
        )}
        {(state === 'invalid' || state === 'no_token') && (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold">Lien invalide</p>
            <p className="text-gray-500 text-sm">
              Ce lien n'est pas valide. Contactez l'équipe Savely.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
