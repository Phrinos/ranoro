import type { Metadata } from 'next';

// Las páginas de servicio compartido contienen datos del cliente (PII). No indexar.
// Refuerzo: X-Robots-Tag para /s/:path* en next.config.mjs (no depende de JS).
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PublicServiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
