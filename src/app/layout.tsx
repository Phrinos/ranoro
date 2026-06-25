// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://ranoro.mx/#website",
        url: "https://ranoro.mx/",
        name: "Ranoro",
        inLanguage: "es-MX",
        publisher: { "@id": "https://ranoro.mx/#localbusiness" },
      },
      {
        "@type": "AutoRepair",
        "@id": "https://ranoro.mx/#localbusiness",
        name: "Ranoro",
        url: "https://ranoro.mx/",
        image: "https://ranoro.mx/og.jpg",
        logo: "https://ranoro.mx/ranoro-logo-negro.png",
        telephone: "+524491425323",
        priceRange: "$$",
        currenciesAccepted: "MXN",
        address: {
          "@type": "PostalAddress",
          streetAddress:
            "Av. de la Convención de 1914 Sur #1421, Jardines de la Concepción I",
          addressLocality: "Aguascalientes",
          addressRegion: "Aguascalientes",
          postalCode: "20267",
          addressCountry: "MX",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 21.8741344,
          longitude: -102.302198,
        },
        areaServed: { "@type": "City", name: "Aguascalientes" },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:30",
            closes: "17:30",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Saturday",
            opens: "08:30",
            closes: "13:30",
          },
        ],
        sameAs: [
          "https://www.facebook.com/ranoromecanica",
          "https://www.instagram.com/ranoromecanica",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Servicios de taller automotriz",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Afinación Integral" } },
            {
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: "Cambio de Aceite" },
              priceSpecification: {
                "@type": "PriceSpecification",
                price: "799",
                priceCurrency: "MXN",
              },
            },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Diagnóstico Computarizado" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Frenos ABS/EBD" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Suspensión y Dirección" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Hojalatería y Pintura" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Reparación de Plásticos" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Servicio a Flotillas" } },
          ],
        },
      },
    ],
  };

  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
