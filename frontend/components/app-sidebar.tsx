'use client';

import {
  ChevronDown,
  ClipboardList,
  FileStack,
  Handshake,
  Heart,
  Inbox,
  LayoutDashboard,
  Leaf,
  LogOut,
  Package,
  Settings,
  Settings2,
  ShoppingBag,
  Tag,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SavelyLogo } from '@/components/savely-logo';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { endSession, Role } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV_TOP = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/products', label: 'Produits', icon: Package, exact: false },
  { href: '/actions', label: "Centre d'actions", icon: Inbox, exact: false },
  { href: '/offers', label: 'Offres B2C', icon: ShoppingBag, exact: false },
];

const DON_NAV = [
  { href: '/donations', label: 'Mes dons', icon: Heart },
  { href: '/annuaire', label: 'Associations', icon: Handshake },
  { href: '/rse', label: 'Bilan RSE', icon: Leaf },
  { href: '/don-parametres', label: 'Paramètres', icon: Settings2 },
];

const NAV_BOTTOM = [
  { href: '/orders', label: 'Commandes', icon: ClipboardList, exact: false },
  { href: '/imports', label: 'Imports', icon: FileStack, exact: false },
];

const DON_PREFIXES = DON_NAV.map((n) => n.href);

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  const isDonSection = DON_PREFIXES.some((p) => pathname.startsWith(p));
  const [donOpen, setDonOpen] = useState(isDonSection);

  // Ouvre automatiquement si on navigue vers un sous-chemin Don
  useEffect(() => {
    if (isDonSection) setDonOpen(true);
  }, [isDonSection]);

  useEffect(() => {
    let active = true;
    fetch('/api/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: Role } | null) => {
        if (active && data?.role) setRole(data.role);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await endSession();
    router.replace('/login');
  };

  const navBottom = [...NAV_BOTTOM];
  if (role === 'TITULAIRE') {
    navBottom.push(
      { href: '/categories', label: 'Catégories', icon: Tag, exact: false },
      { href: '/team', label: 'Préparateurs', icon: Users, exact: false }
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col border-r border-border/50 bg-card">
      <div className="flex h-14 items-center px-4">
        <Link href="/">
          <SavelyLogo className="w-24 h-auto" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Navigation principale */}
        {NAV_TOP.map((item) => {
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

        {/* Section Don Associatif — collapsible */}
        <Collapsible open={donOpen} onOpenChange={setDonOpen}>
          <CollapsibleTrigger
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
              isDonSection
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Heart className="h-4 w-4" />
            <span className="flex-1 text-left">Don Associatif</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                donOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-0.5 space-y-0.5 pl-3">
            {DON_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Navigation secondaire */}
        {navBottom.map((item) => {
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
        {role === 'TITULAIRE' && (
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
        )}
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
