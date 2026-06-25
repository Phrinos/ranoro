import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso denegado',
  robots: { index: false, follow: false },
};

export default function AccesoDenegadoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
