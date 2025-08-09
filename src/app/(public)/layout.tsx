

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Detalle de Servicio - Ranoro',
  description: 'Consulte los detalles de su servicio, cotización o reporte fotográfico.',
  openGraph: {
    title: 'Servicio Automotriz Ranoro',
    description: 'Consulte los detalles de su servicio.',
    images: [
      {
        url: '/ranoro1.jpg', // Must be an absolute URL in production.
        width: 1200,
        height: 630,
        alt: 'Taller Mecánico Profesional Ranoro',
      },
    ],
  },
};

// This is a minimal layout for the public service sheet view page.
// It doesn't include the main app sidebar or header.
export default function PublicPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 min-h-screen">
        <main>
            {children}
        </main>
    </div>
  );
}
