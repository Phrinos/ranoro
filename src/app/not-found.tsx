import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="relative h-12 w-44 mb-8">
        <Image src="/ranoro-logo-negro.png" alt="Ranoro" fill style={{ objectFit: 'contain' }} sizes="176px" priority />
      </div>
      <p className="text-7xl font-extrabold text-primary tracking-tight">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-slate-600">
        La página que buscas no existe o fue movida. Vuelve al inicio o agenda tu cita por WhatsApp.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
        <a
          href="https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100"
        >
          Agendar por WhatsApp
        </a>
      </div>
    </main>
  );
}
