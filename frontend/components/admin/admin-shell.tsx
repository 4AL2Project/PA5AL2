'use client';

import {
  AlertTriangle,
  Building2,
  Home,
  LogOut,
  UserCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { SavelyLogo } from '@/components/savely-logo';
import { endSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  adminEmail?: string;
}

const NAV = [
  { href: '/admin/accueil', label: 'Accueil', icon: Home },
  { href: '/admin', label: 'Officines', icon: Building2 },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/compte', label: 'Compte', icon: UserCircle },
];

export function AdminShell({
  title,
  description,
  actions,
  children,
  adminEmail,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await endSession();
    router.replace('/admin/login');
  };

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="flex w-56 flex-col border-r border-border/50 bg-card">
        <div className="flex h-14 items-center gap-2 px-4">
          <SavelyLogo className="w-16 h-auto" />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Back-office
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/50 p-3">
          {adminEmail && (
            <p className="mb-2 truncate px-3 text-[10px] text-muted-foreground">
              {adminEmail}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-xs text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Se déconnecter
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
