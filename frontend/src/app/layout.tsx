import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Syne } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenBlueprintVault",
  description: "Engineering Drawing Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${bebasNeue.variable} ${ibmPlexMono.variable} ${syne.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
