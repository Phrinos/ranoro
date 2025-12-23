
'use server';
/**
 * @fileOverview An AI flow to enhance text by correcting spelling and grammar.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';

const TextEnhancementFlowInputSchema = z.object({
  textToEnhance: z.string().min(1).describe("The raw text to be enhanced."),
  context: z.string().describe("The context of the text, e.g., 'Notas del Servicio', 'Condiciones del Vehículo'.")
});

const TextEnhancementOutputSchema = z.object({
  enhancedText: z.string().describe("The corrected and improved text, ready for display."),
});

/**
 * A wrapper function that validates the input text before calling the AI flow.
 * This is the function that UI components should call.
 * @param input The object containing the text to enhance and its context.
 * @returns The enhanced text, or the original text if it was invalid or the AI failed.
 */
export async function enhanceText(input: { text: string | null | undefined, context: string }): Promise<string> {
  const { text, context } = input;
  if (!text || text.trim().length < 2) {
    return text || ''; // Return original/empty string if input is not valid for enhancement.
  }
  
  try {
    const result = await enhanceTextFlow({ textToEnhance: text, context });
    return result.enhancedText;
  } catch (e) {
    console.error("enhanceTextFlow failed:", e);
    // In case of AI failure, return the original text to not lose user's input.
    return text;
  }
}

const enhanceTextPrompt = ai.definePrompt({
  name: 'enhanceTextPrompt',
  input: { schema: TextEnhancementFlowInputSchema },
  output: { schema: TextEnhancementOutputSchema },
  prompt: `Eres un experto asesor de servicio automotriz. Tu tarea es mejorar un texto que se usará en un reporte para un cliente. El texto pertenece a la sección: "{{context}}".

Analiza la entrada de texto y sigue una de estas dos rutas:

**Ruta 1: La entrada es una frase CORTA y POSITIVA** (ej: "Todo bien", "OK", "Sin problemas").
- **Tu Acción:** Usa el contexto del campo para generar una descripción profesional y estándar que confirme el buen estado del vehículo. NO devuelvas la frase original.
- **Ejemplo de salida para el contexto "Condiciones del Vehículo":** "Se realizó una inspección visual del vehículo al momento de la recepción. No se observaron daños evidentes en la carrocería ni en los cristales. El estado general es bueno."

**Ruta 2: La entrada describe un PROBLEMA o DETALLE específico** (ej: "Golpe en la fasia trasera", "ruido en el motor al ensender", "llanta delantera derecha baja", "se le cambio el aceite").
- **Tu Acción:** Mantén el significado original. Corrige la ortografía y la gramática. Mejora la claridad y profesionalismo del texto. **NO reemplaces el problema descrito con una nota genérica.**
- **Ejemplo de salida para "Golpe en la fasia trasera":** "Se observa un golpe en la fascia trasera del vehículo."

Reglas Adicionales:
- Redacta en español neutro, con un tono cordial y profesional.
- No superes las 40 palabras.
- Devuelve únicamente el texto corregido y mejorado en el campo 'enhancedText' del JSON de salida.

**Texto original a mejorar:**
"{{{textToEnhance}}}"
`,
});

const enhanceTextFlow = ai.defineFlow(
  {
    name: 'enhanceTextFlow',
    inputSchema: TextEnhancementFlowInputSchema,
    outputSchema: TextEnhancementOutputSchema,
  },
  async (input) => {
    const { output } = await enhanceTextPrompt(input, {
      config: { temperature: 0.4 },
    });
    
    // If the model fails to return valid output, we fall back to the original text.
    return output || { enhancedText: input.textToEnhance };
  }
);
