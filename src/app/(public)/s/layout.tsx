

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

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
        <header className="py-2 px-4 sm:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b print:hidden">
           <div className="container mx-auto flex justify-between items-center">
             <Link href="/login" className="relative w-[140px] h-[40px]">
                <Image
                  src="/ranoro-logo.png"
                  alt="Ranoro Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="dark:invert"
                  priority
                  sizes="(max-width: 768px) 120px, 140px"
                  data-ai-hint="ranoro logo"
                />
             </Link>
           </div>
        </header>
        <main className="p-2 sm:p-4 md:py-8">
            {children}
        </main>
    </div>
  );
}
