
import type { Metadata } from 'next';

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
export default function ServiceSheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 min-h-screen">
        <main className="p-2 sm:p-4 md:py-8">
            {children}
        </main>
    </div>
  );
}
