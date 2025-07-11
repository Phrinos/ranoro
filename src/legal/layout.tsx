
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              width={140}
              height={40}
              className="dark:invert h-auto"
              style={{width: '140px', height: 'auto'}}
              data-ai-hint="ranoro logo"
            />
          </Link>
          <Button asChild>
            <Link href="/login">Regresar al sitio</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 py-8 md:py-12 lg:py-16">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
            <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-t-xl">
                 <Image
                    src="/login.png"
                    alt="Mecánico trabajando en un vehículo"
                    fill
                    className="object-cover object-center"
                    data-ai-hint="mechanic workshop"
                />
            </div>
          <article className="prose dark:prose-invert max-w-none rounded-b-xl border-x border-b bg-card p-4 sm:p-6 md:p-8 lg:p-10 shadow-sm">
            {children}
          </article>
        </div>
      </main>
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500">
          <p>&copy; 2025 Ranoro: Sistema de Administracion Inteligente de Talleres.</p>
          <p>Todos los derechos reservados.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/legal/terminos" className="text-sm text-gray-400 hover:text-white">Términos y Condiciones</Link>
            <Link href="/legal/privacidad" className="text-sm text-gray-400 hover:text-white">Aviso de Privacidad</Link>
          </div>
        </div>
    </footer>
    </div>
  );
}
