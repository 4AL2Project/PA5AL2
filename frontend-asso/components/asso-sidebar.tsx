'use client';

import { Gift, LogOut, Package, User2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { clearToken } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/offres', label: 'Offres reçues', icon: Package },
  { href: '/dons', label: 'Mes dons', icon: Gift },
  { href: '/profil', label: 'Mon profil', icon: User2 },
];

export function AssoSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearToken();
    router.replace('/auth/verify');
  };

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/offres" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-savely-600">
            <span className="text-[11px] font-bold leading-none text-white">
              S
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground">Savely</span>
          <span className="text-[10px] text-muted-foreground">Asso</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary-tint text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
