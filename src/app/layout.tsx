import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ward Watch",
  description: "Report a civic problem with one photo. AI triages it, duplicates merge, and fixes are verified.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">Ward Watch</Link>
          <nav aria-label="Main">
            <Link href="/">Report</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/wards">Wards</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
