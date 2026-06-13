import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'RiskAnalyzer - Product Risk Dashboard',
  description: 'Analyze and monitor product risks with actionable insights',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
