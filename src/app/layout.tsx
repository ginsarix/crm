import '~/styles/globals.css';

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { TRPCReactProvider } from '~/trpc/react';

export const metadata: Metadata = {
  title: 'NesbirCRM',
  description: 'CRM Sistemi',
  icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
};

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${geist.variable}`} lang="tr">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
