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

**Analiza la entrada de texto y sigue una de estas dos rutas, y solo una:**

**Ruta 1: La entrada es una frase CORTA y POSITIVA.**
- **Ejemplos de entrada:** "Todo bien", "OK", "Sin problemas", "No hay fallas", "En buen estado".
- **Tu Acción:** NO devuelvas la frase original. En su lugar, genera una descripción profesional y estándar que confirme el buen estado del vehículo.
- **Ejemplo de salida:** "Se realizó una inspección general y se verificaron los niveles de fluidos, frenos y suspensión. Todo se encuentra en orden y operando correctamente."

**Ruta 2: La entrada describe un PROBLEMA específico o un detalle.**
- **Ejemplos de entrada:** "Golpe en la fasia trasera", "ruido en el motor al ensender", "llanta delantera derecha baja", "se le cambio el aceite".
- **Tu Acción:** Mantén el significado original. Corrige la ortografía y la gramática. Mejora la claridad y profesionalismo del texto. **NO reemplaces el problema descrito con una nota genérica.**
- **Ejemplo de salida para "Golpe en la fasia trasera":** "Se observa un golpe en la fascia trasera del vehículo."

**Reglas Adicionales para AMBAS rutas:**
- Redacta en español neutro, con un tono cordial y profesional.
- No superes las 40 palabras.
- Devuelve únicamente el texto corregido y mejorado en el campo 'enhancedText' del JSON de salida.

**Texto original a mejorar:**
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
