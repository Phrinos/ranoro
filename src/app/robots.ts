import type { MetadataRoute } from 'next';

// Segmentos privados (panel autenticado tras login) y endpoints que no deben rastrearse.
// Los route groups (app)/(public) no añaden segmento a la URL, así que estos paths son las URLs reales.
const PRIVATE_PATHS = [
  '/dashboard', '/servicios', '/vehiculos', '/usuarios', '/agenda',
  '/punto-de-venta', '/administracion', '/facturacion', '/flotilla',
  '/listadeprecios', '/opciones', '/personal', '/ticket', '/whatsapp',
  '/login', '/acceso-denegado', '/api/',
];

// Crawlers de buscadores y asistentes de IA que SÍ queremos que indexen el sitio público
// (objetivo: que las IA encuentren y describan Ranoro fácilmente). Se les permite todo lo
// público y se les niega el panel privado, igual que al resto.
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'Claude-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
  'Amazonbot', 'cohere-ai', 'Meta-ExternalAgent', 'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_BOTS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: 'https://ranoro.mx/sitemap.xml',
  };
}
