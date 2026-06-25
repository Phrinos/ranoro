import type { MetadataRoute } from 'next';

const BASE = 'https://ranoro.mx';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/facturar`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/legal/terminos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
