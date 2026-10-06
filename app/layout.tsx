import type { Metadata } from "next";
import { Barlow, Bebas_Neue } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({ variable: "--font-bebas-neue", subsets: ["latin"], weight: "400" });
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "The Lions of ESI",
  description: "Plateforme de l'équipe ESI Basketball — INTER-ÉCOLES INP-HB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${bebasNeue.variable} ${barlow.variable} antialiased`}>{children}</body>
    </html>
  );
}
