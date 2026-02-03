// app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ranoro.mx"),
  applicationName: "Ranoro",
  title: {
    default:
      "Ranoro Taller en Aguascalientes | Mecánica, Hojalatería y Pintura",
    template: "%s | Ranoro",
  },
  description:
    "Taller mecánico en Aguascalientes. Mantenimientos claros, trabajo garantizado y trato honesto. Especialistas en mecánica rápida, frenos, suspensión y pintura.",
  keywords: [
    "taller mecánico Aguascalientes",
    "mecánico cerca de mí",
    "frenos",
    "suspensión",
    "mecánica rápida",
    "hojalatería",
    "pintura",
    "servicio automotriz",
  ],
  referrer: "origin-when-cross-origin",
  category: "automotive",
  alternates: {
    canonical: "/",
    languages: {
      "es-MX": "/",
      es: "/",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://ranoro.mx/",
    siteName: "Ranoro",
    locale: "es_MX",
    title: "Ranoro Taller en Aguascalientes | Mecánica, Hojalatería y Pintura",
    description:
      "Mantenimientos claros, trabajo garantizado y trato honesto. Especialistas en mecánica rápida, frenos, suspensión y pintura.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Ranoro Taller Automotriz en Aguascalientes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ranoromx",
    creator: "@ranoromx",
    title: "Ranoro Taller en Aguascalientes",
    description:
      "Mecánica, frenos, suspensión y pintura con trato honesto y garantía.",
    images: ["/og.jpg"],
  },
  formatDetection: {
    telephone: true,
    address: true,
    email: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#0b0b0b",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Ranoro",
    statusBarStyle: "black-translucent",
  },
  other: {
    "msapplication-TileColor": "#0b0b0b",
    "color-scheme": "light dark",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: "Ranoro",
    url: "https://ranoro.mx/",
    image: "https://ranoro.mx/og.jpg",
    telephone: "+52 449 142 5323",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Av. de la Convención de 1914 No. 1421",
      addressLocality: "Aguascalientes",
      addressRegion: "AGS",
      postalCode: "20267",
      addressCountry: "MX",
    },
    areaServed: "Aguascalientes",
    sameAs: [
      "https://www.facebook.com/ranoromx",
      "https://www.instagram.com/ranoromx",
    ],
  };

  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
        <Script
          id="ld-localbusiness"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
