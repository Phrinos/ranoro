// src/app/(public)/s/layout.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Detalle de Servicio - Ranoro',
  description: 'Consulte los detalles de su servicio, cotización o reporte fotográfico.',
  openGraph: {
    title: 'Servicio Automotriz Ranoro',
    description: 'Consulte los detalles de su servicio.',
    images: [
      {
        url: '/ranoro1.jpg',
        width: 1200,
        height: 630,
        alt: 'Taller Mecánico Profesional Ranoro',
      },
    ],
  },
};

export default function ServiceSheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 min-h-screen">
        <main>
            {children}
        </main>
    </div>
  );
}
