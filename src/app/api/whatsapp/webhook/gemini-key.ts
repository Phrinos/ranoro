/** Lee y normaliza la GEMINI_API_KEY del entorno (tolera el formato `KEY=valor` y comillas). */
export function resolveGeminiKey(): string {
  let key = process.env.GEMINI_API_KEY || '';
  if (key.includes('=')) {
    const m = key.match(/GEMINI_API_KEY=([A-Za-z0-9_\-]+)/);
    if (m) key = m[1];
  }
  return key.trim().replace(/^["']|["']$/g, '');
}
