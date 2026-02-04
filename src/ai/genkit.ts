import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    // Esto buscará automáticamente la variable GOOGLE_GENAI_API_KEY en tu .env
    googleAI(), 
  ],
  model: 'googleai/gemini-1.5-pro', 
});
