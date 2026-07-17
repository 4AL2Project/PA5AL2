'use client';
import { Gift, LogOut, Package, User2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { clearToken } from '@/lib/api';

const NAV = [
  { href: '/offres', label: 'Offres reçues', icon: Package },
  { href: '/dons', label: 'Mes dons', icon: Gift },
  { href: '/profil', label: 'Mon profil', icon: User2 },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearToken();
    router.replace('/auth/verify');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/offres" className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 bg-savely-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold leading-none">
                  S
                </span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                Savely
              </span>
              <span className="hidden sm:block text-gray-300">·</span>
              <span className="hidden sm:block text-sm text-gray-500">
                Associations
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              {NAV.map((n) => {
                const active =
                  pathname === n.href || pathname.startsWith(n.href + '/');
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-savely-50 text-savely-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:block">{n.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
