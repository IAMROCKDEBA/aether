import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeScript } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aether — Share files with precision",
    template: "%s · Aether",
  },
  description:
    "Cloud file sharing with precise permission control: private, restricted and public access, plus expiring links. Stored on Amazon S3.",
  applicationName: "Aether",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0eee9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b0e" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="grain">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
