import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ranoro — Taller Mecánico en Aguascalientes',
    short_name: 'Ranoro',
    description:
      'Taller automotriz en Aguascalientes: mecánica, hojalatería y pintura con diagnóstico claro y garantía.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F5F5',
    theme_color: '#a2231d',
    lang: 'es-MX',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
