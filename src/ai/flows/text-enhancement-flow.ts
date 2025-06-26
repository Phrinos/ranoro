'use server';
/**
 * @fileOverview An AI flow to enhance text by correcting spelling and grammar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TextEnhancementInputSchema = z.string().min(1).nullable().describe("The text to be enhanced.");
const TextEnhancementOutputSchema = z.object({
  enhancedText: z.string().describe("The corrected and improved text, ready for display."),
});

/**
 * A wrapper function that validates the input text before calling the AI flow.
 * This is the function that UI components should call.
 * @param text The text to enhance. Can be null, undefined, o a string.
 * @returns The enhanced text, or the original text if it was invalid or the AI failed.
 */
export async function enhanceText(text: string | null | undefined): Promise<string> {
  if (!text || text.trim().length < 2) {
    return text || ''; // Return original/empty string if input is not valid for enhancement.
  }
  
  // Only call the flow if we have valid text.
  try {
    const result = await enhanceTextFlow(text);
    return result.enhancedText; // Extract the text from the result object
  } catch (e) {
    console.error("enhanceTextFlow failed:", e);
    // In case of AI failure, return the original text to not lose user's input.
    return text;
  }
}

const enhanceTextPrompt = ai.definePrompt({
  name: 'enhanceTextPrompt',
  input: { schema: TextEnhancementInputSchema },
  output: { schema: TextEnhancementOutputSchema }, // Use the new object schema
  prompt: `Eres un experto asesor de servicio automotriz. Tu tarea es mejorar el siguiente texto, que será usado en un reporte de servicio para un cliente.

1.  **Analiza la entrada:**
    - Si la entrada es una frase simple y positiva como "Todo bien", "OK", "Sin problemas", "No hay fallas" o similar, **NO devuelvas la frase original**. En su lugar, genera un resumen más profesional y descriptivo de una revisión vehicular estándar. Por ejemplo: "Se realizó una inspección general y se verificaron los niveles de fluidos, frenos y suspensión. Todo se encuentra en orden y operando correctamente."
    - Si la entrada describe un problema específico, corrige la ortografía y la gramática, y mejora la claridad manteniendo el significado original.

2.  **Sigue estas reglas:**
    - Redacta en español neutro, con un tono cordial y profesional.
    - **Es crucial que no inventes nuevos problemas o fallas.** Solo describe las revisiones estándar u observaciones que confirman que el vehículo está en buen estado si la entrada es positiva y simple.
    - Mantén el texto final conciso, idealmente de menos de 40 palabras.
    - Devuelve únicamente el texto corregido y mejorado en el campo 'enhancedText' del JSON de salida.

Texto original a mejorar:
"{{{this}}}"
`,
});

const enhanceTextFlow = ai.defineFlow(
  {
    name: 'enhanceTextFlow',
    inputSchema: TextEnhancementInputSchema,
    outputSchema: TextEnhancementOutputSchema, // Use the new object schema
  },
  async (text) => {
    // Return early if text is null or invalid to avoid sending null data to the model.
    if (!text || text.trim().length < 2) {
      return { enhancedText: text || '' };
    }
    
    // The result is in the `output` property.
    const { output } = await enhanceTextPrompt(text, {
      config: { temperature: 0.4 }, // Increased temperature for more creative enrichment
    });
    
    // If the model fails to return valid output, we fall back to the original text.
    return output || { enhancedText: text };
  }
);
