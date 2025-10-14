
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Ranoro Taller en Aguascalientes | Mecánica, Hojalatería y Pintura',
  description: 'Taller mecánico en Aguascalientes. Mantenimientos claros, trabajo garantizado y trato honesto. Especialistas en mecánica rápida, frenos, suspensión y pintura.',
  openGraph: {
    title: 'Ranoro Taller en Aguascalientes | Mecánica, Hojalatería y Pintura',
    description: 'Servicio profesional para tu auto. Agenda por WhatsApp.',
    images: [
      {
        url: '/home.png', // Must be an absolute URL in production.
        width: 1200,
        height: 630,
        alt: 'Taller Mecánico Profesional Ranoro en Aguascalientes',
      },
    ],
  },
};

export default function PublicPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
        <header className="sticky top-0 z-40 w-full border-b bg-background print:hidden">
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
                    <Button asChild>
                      <Link href="/login">Iniciar Sesión</Link>
                    </Button>
                </div>
            </div>
        </header>
        <main className="flex-1">
            {children}
            <Analytics />
            <SpeedInsights />
        </main>
        <footer className="bg-gray-900 text-white print:hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500 text-xs">
                <p>Precios en MXN. Sujetos a diagnóstico y disponibilidad. Aplican restricciones.</p>
                <p className="mt-2">&copy; {new Date().getFullYear()} Ranoro Taller. Todos los derechos reservados.</p>
            </div>
        </footer>
    </div>
  );
}
