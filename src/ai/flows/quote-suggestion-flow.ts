'use server';
/**
 * @fileOverview An AI flow to suggest a full quote (supplies and price) for a vehicle service.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema
const QuoteSuggestionInputSchema = z.object({
  serviceDescription: z.string().describe("La descripción del servicio que el cliente solicita."),
});
export type QuoteSuggestionInput = z.infer<typeof QuoteSuggestionInputSchema>;

// Output schema
const QuoteItemSchema = z.object({
    name: z.string().describe("Nombre del trabajo o refacción."),
    quantity: z.number().describe("Cantidad."),
    price: z.number().describe("Precio sugerido al cliente."),
    type: z.enum(['work', 'part']).describe("Tipo de ítem."),
});

const QuoteSuggestionOutputSchema = z.object({
  items: z.array(QuoteItemSchema),
  estimatedTotal: z.number().describe("Total sugerido incluyendo IVA."),
  reasoning: z.string().describe("Explicación del cálculo realizado."),
});
export type QuoteSuggestionOutput = z.infer<typeof QuoteSuggestionOutputSchema>;

export async function suggestQuote(input: QuoteSuggestionInput): Promise<QuoteSuggestionOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.0-flash-exp',
    system: `Eres un experto cotizador de taller mecánico. Tu tarea es generar una lista de trabajos y refacciones basada en la solicitud del cliente.
    Reglas:
    1. Divide la cotización en 'work' (mano de obra) y 'part' (refacciones).
    2. Los precios deben ser realistas para el mercado de México (Pesos MXN).
    3. Incluye siempre una partida de mano de obra.
    4. El total debe ser la suma de los ítems.
    5. Responde siempre en español.`,
    prompt: `Genera una cotización detallada para: ${input.serviceDescription}`,
    output: { schema: QuoteSuggestionOutputSchema }
  });

  if (!output) throw new Error("No se pudo generar la cotización.");
  return output;
}
