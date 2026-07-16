'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { clearToken } from '@/lib/api';

const NAV = [
  { href: '/offres', label: 'Offres reçues' },
  { href: '/dons', label: 'Mes dons' },
  { href: '/profil', label: 'Mon profil' },
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
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/offres" className="text-savely-600 font-bold text-lg">
            Savely Asso
          </Link>
          <div className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.startsWith(n.href) ? 'bg-savely-50 text-savely-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                {n.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="ml-4 text-xs text-gray-400 hover:text-gray-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
