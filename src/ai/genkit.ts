import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuración centralizada de Genkit utilizando Google AI.
 * Se utiliza una referencia de cadena para el modelo para asegurar compatibilidad 
 * y evitar errores de exportación durante la compilación.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-pro',
});
