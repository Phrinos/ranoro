
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ranoro Taller en Aguascalientes | Mecánica, Hojalatería y Pintura',
  description: 'Taller mecánico en Aguascalientes. Mantenimientos claros, trabajo garantizado y trato honesto. Especialistas en mecánica rápida, frenos, suspensión y pintura.',
  openGraph: {
    title: 'Ranoro Taller en Aguascalientes | Mecánica, Hojalatería y Pintura',
    description: 'Servicio profesional para tu auto. Agenda por WhatsApp.',
    images: [
      {
        url: '/home.png',
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
        </main>
    </div>
  );
}
