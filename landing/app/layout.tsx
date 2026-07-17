import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Savely — Valorisez votre stock dormant',
  description:
    'La plateforme qui transforme votre stock dormant en économies réelles. Dons tracés, reçus fiscaux automatiques, 60% de réduction fiscale art. 238 bis CGI.',
  openGraph: {
    title: 'Savely — Valorisez votre stock dormant',
    description:
      'Cerfa 16216 automatique. 60% de réduction fiscale. Matching association sous 48h.',
    url: 'https://savelypharma.fr',
    siteName: 'Savely',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={font.className}>
      <body>{children}</body>
    </html>
  );
}
