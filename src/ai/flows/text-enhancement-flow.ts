
'use server';
/**
 * @fileOverview An AI flow to enhance text by correcting spelling and grammar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TextEnhancementInputSchema = z.string().min(1).describe("The text to be enhanced.");
const TextEnhancementOutputSchema = z.string().describe("The corrected and improved text.");

/**
 * A wrapper function that validates the input text before calling the AI flow.
 * This is the function that UI components should call.
 * @param text The text to enhance. Can be null, undefined, or a string.
 * @returns The enhanced text, or the original text if it was invalid or the AI failed.
 */
export async function enhanceText(text: string | null | undefined): Promise<string> {
  if (!text || text.trim().length < 2) {
    return text || ''; // Return original/empty string if input is not valid for enhancement.
  }
  
  // Only call the flow if we have valid text.
  try {
    return await enhanceTextFlow(text);
  } catch (e) {
    console.error("enhanceTextFlow failed:", e);
    // In case of AI failure, return the original text to not lose user's input.
    return text;
  }
}

const enhanceTextPrompt = ai.definePrompt({
  name: 'enhanceTextPrompt',
  input: { schema: TextEnhancementInputSchema },
  output: { schema: TextEnhancementOutputSchema },
  prompt: `Eres un asesor de servicio automotriz. Mejora el siguiente texto:

- Corrige ortografía y gramática.
- Redacta en español neutro, tono cordial y profesional.
- Enriquece con un breve contexto (ej. indicar que se verificaron niveles, frenos y suspensión) **sin inventar fallas**.
- No superes 40 palabras.
- Devuelve únicamente el texto corregido como una cadena de texto simple.

Texto original:
"{{{this}}}"
`,
});

const enhanceTextFlow = ai.defineFlow(
  {
    name: 'enhanceTextFlow',
    inputSchema: TextEnhancementInputSchema,
    outputSchema: TextEnhancementOutputSchema,
  },
  async (text) => {
    const { output } = await enhanceTextPrompt(text, {
      config: { temperature: 0.1 }, // Use low temperature for deterministic corrections
    });
    
    // If the model fails to return valid output, we fall back to the original text.
    return output || text;
  }
);
