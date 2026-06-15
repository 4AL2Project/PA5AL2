'use client';

import { Inbox, LayoutDashboard, LogOut, Package, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { SavelyLogo } from '@/components/savely-logo';
import { Button } from '@/components/ui/button';
import { endSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/products', label: 'Produits', icon: Package, exact: false },
  { href: '/actions', label: "Centre d'actions", icon: Inbox, exact: false },
];

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await endSession();
    router.replace('/login');
  };

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-border/50 bg-card">
      <div className="flex h-14 items-center px-4">
        <Link href="/">
          <SavelyLogo className="w-24 h-auto" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
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
        {userEmail && (
          <p className="mb-2 truncate px-3 text-[10px] text-muted-foreground">
            {userEmail}
          </p>
        )}
        <Link
          href="/settings"
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Paramètres
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-1 w-full justify-start text-xs text-muted-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  );
}
