'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Frontière d'erreur commune aux pages admin (elle couvre les segments imbriqués).
 * Sans elle, un backend injoignable se lit comme « aucune donnée » : les pages
 * sont des Server Components et leurs helpers lèvent désormais au lieu de
 * renvoyer une liste vide.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-semibold">
          Impossible de charger les données
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          L&apos;API n&apos;a pas répondu. Ce n&apos;est pas un manque de
          données : vérifiez que le backend tourne et qu'il est joignable depuis
          le serveur Next.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Référence : {error.digest}
          </p>
        )}
        <Button onClick={reset} variant="outline" size="sm" className="mt-5">
          Réessayer
        </Button>
      </div>
    </div>
  );
}
