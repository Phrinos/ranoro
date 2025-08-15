
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex min-h-screen flex-col bg-muted/30">
        <header className="sticky top-0 z-40 w-full border-b border-gray-700 bg-gray-900 print:hidden">
             <div className="container mx-auto flex h-auto min-h-20 flex-wrap items-center justify-between gap-y-2 py-2 px-4 md:px-6">
                <Link href="/" className="relative w-[140px] h-[40px]">
                    <Image
                    src="/ranoro-logo.png"
                    alt="Ranoro Logo"
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="140px"
                    priority
                    data-ai-hint="ranoro logo"
                    />
                </Link>
                <div className="flex items-center gap-2 text-sm">
                    <Link href="/legal/terminos" className="text-gray-300 hover:text-white transition-colors">
                        <Badge variant="outline" className="text-xs border-white/50 text-white/90 hover:bg-white/10 px-3 py-1">
                            Términos y Condiciones
                        </Badge>
                    </Link>
                    <Link href="/legal/privacidad" className="text-gray-300 hover:text-white transition-colors">
                         <Badge variant="outline" className="text-xs border-white/50 text-white/90 hover:bg-white/10 px-3 py-1">
                            Aviso de Privacidad
                        </Badge>
                    </Link>
                </div>
            </div>
        </header>
        <main className="flex-1">
            {children}
        </main>
        <footer className="bg-gray-900 text-white print:hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500">
                <p>&copy; 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914</p>
            </div>
        </footer>
    </div>
  );
}
