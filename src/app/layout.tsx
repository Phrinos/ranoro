
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://ranoro.mx'),
  title: 'RANORO - Tu taller en una app',
  description: 'El sistema operativo inteligente para tu taller mecánico. Por Arturo Valdelamar',
  icons: {
    icon: '/ranoro-logo.png', // Use logo directly as favicon
    shortcut: '/ranoro-logo.png',
    apple: '/ranoro-logo.png',
  },
  openGraph: {
    title: 'RANORO - Tu taller en una app',
    description: 'El sistema operativo inteligente para tu taller mecánico.',
    images: [
      {
        url: '/home.png', // Use absolute URL in production if deployed
        width: 1200,
        height: 630,
        alt: 'Ranoro - El sistema operativo inteligente para tu taller mecánico.',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} font-body antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
