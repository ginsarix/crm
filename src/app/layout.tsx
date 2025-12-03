import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { env } from "~/env";
import { auth } from "~/server/better-auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "PanuCRM",
  description: "CRM Sistemi",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  auth.api
    .signUpEmail({
      body: {
        name: "Default Admin",
        email: env.DEFAULT_ADMIN_EMAIL,
        password: env.DEFAULT_ADMIN_PASSWORD,
      },
    })
    .catch(() => {});

  return (
    <html className={`${geist.variable}`} lang="tr">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
