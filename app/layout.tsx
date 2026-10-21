import type { Metadata, Viewport } from "next";
import { headers } from 'next/headers'
import Script from 'next/script'
import SplashScreen from '@/components/SplashScreen'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import "./globals.css";


export const metadata: Metadata = {
  title: "The Lions of ESI",
  description: "Plateforme de l'équipe ESI Basketball ",
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: 'oklch(0.3514 0.1269 16.8)' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <Script id="lions-theme-session" strategy="beforeInteractive" nonce={nonce}>{`const root = document.documentElement;
          const systemTheme = matchMedia('(prefers-color-scheme: dark)');
          const applySavedTheme = () => {
            let saved = null;
            try { saved = localStorage.getItem('theme'); } catch {}
            root.classList.toggle('dark', saved === 'dark' || (!saved && systemTheme.matches));
          };
          applySavedTheme();
          systemTheme.addEventListener('change', applySavedTheme);
          window.addEventListener('storage', (event) => { if (event.key === 'theme' || event.key === null) applySavedTheme(); });`}</Script>
        <Script id="lions-splash-session" strategy="beforeInteractive" nonce={nonce}>{`try { if (sessionStorage.getItem('lions-splash-seen') === '1') document.documentElement.dataset.splashSeen = 'true'; else document.documentElement.dataset.splashEnabled = 'true'; } catch { document.documentElement.dataset.splashEnabled = 'true'; }`}</Script>
        <noscript><style nonce={nonce}>{`.lions-splash{display:none!important}`}</style></noscript>
      </head>
      <body className="antialiased">
        {children}
        <PwaInstallPrompt />
        <SplashScreen />
      </body>
    </html>
  );
}
