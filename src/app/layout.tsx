import '~/styles/globals.css';

import type { Metadata } from 'next';
import { Barlow, IBM_Plex_Mono } from 'next/font/google';
import { ViewTransition } from 'react';
import { TRPCReactProvider } from '~/trpc/react';

export const metadata: Metadata = {
  title: 'NesbirCRM',
  description: 'CRM Sistemi',
  icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
};

const barlow = Barlow({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${barlow.variable} ${ibmPlexMono.variable}`} lang="tr">
      <body>
        <TRPCReactProvider>
          <ViewTransition>{children}</ViewTransition>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
