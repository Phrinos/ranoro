import { genkit } from 'genkit';
import { googleAI, gemini15Pro } from '@genkit-ai/google-genai';

/**
 * Configuración centralizada de Genkit utilizando Google AI.
 * Al usar la referencia del objeto 'gemini15Pro', el SDK maneja
 * automáticamente los IDs de versión correctos para la API de AI Studio.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: gemini15Pro, 
});
