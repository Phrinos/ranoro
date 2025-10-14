
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
