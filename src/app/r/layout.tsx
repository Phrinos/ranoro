

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reporte de Flotilla - Ranoro',
  description: 'Consulte el reporte de ingresos generado para su flotilla.',
  openGraph: {
    title: 'Reporte de Flotilla - Ranoro',
    description: 'Consulte el reporte de ingresos para su flotilla.',
    images: [
      {
        url: '/ranoro1.jpg', // Must be an absolute URL in production.
        width: 1200,
        height: 630,
        alt: 'Gestión de Flotillas en Ranoro',
      },
    ],
  },
};

// This is a minimal layout for the public owner report view page.
// It doesn't include the main app sidebar or header.
export default function ReportViewLayout({
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
