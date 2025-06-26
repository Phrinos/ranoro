'use server';
/**
 * @fileOverview An AI flow to enhance text by correcting spelling and grammar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TextEnhancementInputSchema = z.string().min(1).nullable().describe("The text to be enhanced.");
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
  prompt: `Eres un experto asesor de servicio automotriz. Tu tarea es mejorar el siguiente texto, que será usado en un reporte de servicio para un cliente.

- Corrige cualquier error de ortografía y gramática.
- Redacta en español neutro, con un tono cordial y profesional.
- **Enriquece el texto con contexto relevante.** Por ejemplo, si la entrada es simple como "Todo bien" o "Sin problemas", amplíala para mencionar las revisiones estándar realizadas, como "Se realizó una inspección general y se verificaron los niveles de fluidos, frenos y suspensión. Todo se encuentra en orden y operando correctamente."
- **Es crucial que no inventes nuevos problemas o fallas.** Solo describe las revisiones estándar u observaciones que confirman que el vehículo está en buen estado.
- Mantén el texto final conciso, idealmente de menos de 40 palabras.
- Devuelve únicamente el texto corregido y mejorado como una cadena de texto simple.

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
    // Return early if text is null or invalid to avoid sending null data to the model.
    if (!text || text.trim().length < 2) {
      return text || '';
    }
    
    const { output } = await enhanceTextPrompt(text, {
      config: { temperature: 0.4 }, // Increased temperature for more creative enrichment
    });
    
    // If the model fails to return valid output, we fall back to the original text.
    return output || text;
  }
);
