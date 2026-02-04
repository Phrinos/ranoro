import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuración centralizada de Genkit utilizando Google AI.
 * Se utiliza googleAI.model() para referenciar el modelo de forma robusta,
 * evitando errores de exportación en el plugin.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: googleAI.model('gemini-1.5-pro'), 
});
