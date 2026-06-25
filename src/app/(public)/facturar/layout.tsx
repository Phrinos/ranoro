import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Facturación de Tickets',
  description:
    'Genera tu factura electrónica (CFDI) de tu servicio en Ranoro. Ingresa el folio y el monto de tu ticket. Disponible durante 48 horas tras la emisión.',
  alternates: { canonical: '/facturar' },
};

export default function FacturarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
