import type { Metadata } from "next";
import { Barlow, Bebas_Neue } from "next/font/google";
import { headers } from 'next/headers'
import Script from 'next/script'
import SplashScreen from '@/components/SplashScreen'
import "./globals.css";

const bebasNeue = Bebas_Neue({ variable: "--font-bebas-neue", subsets: ["latin"], weight: "400" });
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "The Lions of ESI",
  description: "Plateforme de l'équipe ESI Basketball — INTER-ÉCOLES INP-HB",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <Script id="lions-splash-session" strategy="beforeInteractive" nonce={nonce}>{`try { if (sessionStorage.getItem('lions-splash-seen') === '1') document.documentElement.dataset.splashSeen = 'true'; else document.documentElement.dataset.splashEnabled = 'true'; } catch { document.documentElement.dataset.splashEnabled = 'true'; }`}</Script>
        <noscript><style nonce={nonce}>{`.lions-splash{display:none!important}`}</style></noscript>
      </head>
      <body className={`${bebasNeue.variable} ${barlow.variable} antialiased`}>
        {children}
        <SplashScreen />
      </body>
    </html>
  );
}
