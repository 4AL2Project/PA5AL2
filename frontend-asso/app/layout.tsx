import './globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Savely — Espace Association',
  description: 'Gérez vos offres de dons de médicaments et produits de santé.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
