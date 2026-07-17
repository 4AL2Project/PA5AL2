'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import {
  decodeJwt,
  landingPathForRole,
  startSession,
  verifyMagicLink,
} from '@/lib/auth';

type Status = 'verifying' | 'success' | 'invalid' | 'disabled';

const DEFAULT_DISABLED_MESSAGE =
  'Votre officine a été désactivée. Contactez le support Savely pour réactiver votre accès.';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [disabledMessage, setDisabledMessage] = useState(
    DEFAULT_DISABLED_MESSAGE
  );

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const tokens = await verifyMagicLink(token);
        if (cancelled) return;
        await startSession(tokens);
        const claims = decodeJwt(tokens.access_token);
        const target = claims ? landingPathForRole(claims.role) : '/';
        setStatus('success');
        router.replace(target);
      } catch (err) {
        if (cancelled) return;
        const e = err as { status?: number; message?: string };
        if (e.status === 403) {
          setDisabledMessage(e.message ?? DEFAULT_DISABLED_MESSAGE);
          setStatus('disabled');
        } else {
          setStatus('invalid');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (status === 'verifying') {
    return (
      <AuthShell
        title="Connexion en cours"
        description="Validation du lien magique..."
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell
        title="Connecté"
        description="Redirection vers votre espace..."
      >
        <div className="flex items-center justify-center py-4">
          <CheckCircle2 className="h-5 w-5 text-risk-low" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'disabled') {
    return (
      <AuthShell
        title="Compte désactivé"
        description="Vous ne pouvez pas accéder à votre espace pour le moment."
      >
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3 mb-5">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <p className="text-xs text-muted-foreground">{disabledMessage}</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Lien expiré ou invalide"
      description="Ce lien magique n’est plus valide. Demandez-en un nouveau pour continuer."
    >
      <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3 mb-5">
        <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Les liens de connexion expirent au bout de 15 minutes et ne peuvent
          être utilisés qu’une seule fois.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link href="/login">Demander un nouveau lien</Link>
      </Button>
    </AuthShell>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          title="Connexion en cours"
          description="Validation du lien magique..."
        >
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </AuthShell>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
