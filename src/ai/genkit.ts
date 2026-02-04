import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuración centralizada de Genkit utilizando Google AI.
 * Se utiliza googleAI.model() para referenciar el modelo de forma robusta.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // Actualizamos al motor 2.0 Flash para mayor velocidad y precisión en el chat
  model: googleAI.model('gemini-2.0-flash'), 
});
