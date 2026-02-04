import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

/**
 * Configuración centralizada de Genkit utilizando Vertex AI.
 * Vertex AI es el estándar para entornos de Google Cloud/Firebase Studio,
 * evitando bloqueos de API externa y problemas de permisos.
 */
export const ai = genkit({
  plugins: [
    vertexAI({
      location: 'us-central1',
    }),
  ],
  model: 'vertexai/gemini-1.5-pro',
});
