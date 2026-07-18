'use client';

// Vérification de l'email d'inscription d'une association (lien 48 h)

import { CheckCircle2, Heart, Loader2, XCircle } from 'lucide-react';
import { use, useEffect, useState } from 'react';

export default function VerifyAssociationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/be/api/public/associations/verify/${token}`,
        { method: 'POST' }
      );
      const payload = await res.json().catch(() => null);
      if (cancelled) return;
      if (res.ok) {
        setState('ok');
      } else {
        setState('error');
        setMessage(payload?.error?.message ?? 'Lien invalide ou expiré');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <Heart className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">
            Savely — Dons solidaires
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-xl border bg-card p-10 text-center">
          {state === 'loading' && (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          )}
          {state === 'ok' && (
            <>
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
              <h1 className="text-lg font-semibold">Email confirmé</h1>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Votre demande est en cours d&apos;examen par l&apos;équipe
                Savely. Vous recevrez une réponse par email sous quelques jours.
              </p>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Vérification impossible</h1>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {message}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
