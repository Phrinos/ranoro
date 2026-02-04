import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuración centralizada de Genkit utilizando el plugin de Google AI.
 * Se define el modelo predeterminado como 'googleai/gemini-1.5-pro' para evitar
 * errores de resolución de nombres (404) y asegurar consistencia en todos los flujos.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-pro',
});
