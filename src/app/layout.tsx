

import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ranoro - Gestión de Taller',
  description: 'Aplicación para la gestión eficiente de talleres mecánicos by Arturo Valdelamar',
  icons: {
    icon: '/ranoro-logo.png', // Main favicon
    shortcut: '/ranoro-logo.png',
    apple: '/ranoro-logo.png',
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
