import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fiscale — GAR",
  description: "Fatturazione elettronica, incassi e scadenze fiscali in regime forfettario.",
  // Su iOS Safari evidenzia da sé come link telefonici le sequenze di cifre:
  // partite IVA, codici tributo e importi non sono numeri di telefono.
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Fiscale" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lo zoom resta abilitato: bloccarlo è una barriera di accessibilità, e su
  // una schermata fitta di importi serve poterli ingrandire.
  maximumScale: 5,
  themeColor: "#0a0c10",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
