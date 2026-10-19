import type { Metadata } from "next";
import { headers } from 'next/headers'
import Script from 'next/script'
import SplashScreen from '@/components/SplashScreen'
import "./globals.css";


export const metadata: Metadata = {
  title: "The Lions of ESI",
  description: "Plateforme de l'équipe ESI Basketball ",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <Script id="lions-theme-session" strategy="beforeInteractive" nonce={nonce}>{`try { if (localStorage.getItem('lions-theme') === 'dark') document.documentElement.classList.add('dark'); } catch {}`}</Script>
        <Script id="lions-splash-session" strategy="beforeInteractive" nonce={nonce}>{`try { if (sessionStorage.getItem('lions-splash-seen') === '1') document.documentElement.dataset.splashSeen = 'true'; else document.documentElement.dataset.splashEnabled = 'true'; } catch { document.documentElement.dataset.splashEnabled = 'true'; }`}</Script>
        <noscript><style nonce={nonce}>{`.lions-splash{display:none!important}`}</style></noscript>
      </head>
      <body className="antialiased">
        {children}
        <SplashScreen />
      </body>
    </html>
  );
}
