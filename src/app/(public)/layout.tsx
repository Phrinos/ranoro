
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
    <div className="flex min-h-screen flex-col bg-slate-50 relative selection:bg-red-500/20">
        {/* Subtle top decoration glow for Ranoro */}
        <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-slate-200/50 to-transparent pointer-events-none" />
        
        <main className="flex-1 relative z-10 p-4 sm:px-6 md:px-8 py-8 md:py-12 max-w-5xl mx-auto w-full">
            {children}
        </main>
    </div>
  );
}
