'use client';

import { AlertTriangle, Building2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { endSession } from '@/lib/auth';

interface AdminShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  adminEmail?: string;
}

export function AdminShell({
  title,
  description,
  actions,
  children,
  adminEmail,
}: AdminShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await endSession();
    router.replace('/admin/login');
  };

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <AlertTriangle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Savely</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Back-office
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/admin">
                <Building2 className="h-3.5 w-3.5" />
                Officines
              </Link>
            </Button>
            {adminEmail && (
              <span className="text-xs text-muted-foreground">
                {adminEmail}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
