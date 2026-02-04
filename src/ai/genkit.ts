import { genkit } from 'genkit';
import { googleAI, gemini15Pro } from '@genkit-ai/google-genai';

/**
 * Configuración centralizada de Genkit utilizando Google AI.
 * Se utiliza una referencia directa al modelo para evitar errores de resolución (404).
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: gemini15Pro,
});
