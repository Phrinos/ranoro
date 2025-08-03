
'use server';
/**
 * @fileOverview An AI flow to analyze inventory and suggest reordering actions.
 * This file has been updated to improve the context sent to the AI, ensuring
 * that it can correctly correlate historical usage with current inventory items.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { parseISO, differenceInDays } from 'date-fns';

// --- Main Input Schemas (from UI) ---

const InventoryItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  lowStockThreshold: z.number(),
});

const ServiceRecordInputSchema = z.object({
    serviceDate: z.string().optional().describe("The date the service was performed in ISO format."),
    suppliesUsed: z.array(z.object({
        supplyId: z.string(),
        supplyName: z.string().describe("The name of the supply used. This is crucial for the AI to understand what was used."),
        quantity: z.number(),
    })),
});

const AnalyzeInventoryInputSchema = z.object({
  inventoryItems: z.array(InventoryItemInputSchema).describe("The current list of all inventory items."),
  serviceRecords: z.array(ServiceRecordInputSchema).describe("A history of all completed service records showing parts usage, including their names."),
});
export type AnalyzeInventoryInput = z.infer<typeof AnalyzeInventoryInputSchema>;


// --- Output Schemas (for UI) ---

const InventoryRecommendationSchema = z.object({
    itemId: z.string().describe("El ID del artículo de inventario."),
    itemName: z.string().describe("El nombre del artículo de inventario."),
    recommendation: z.string().describe("Una recomendación clara, p. ej., 'Reordenar ahora', 'Stock saludable', 'Nivel de stock crítico'."),
    reasoning: z.string().describe("Una breve explicación para la recomendación, citando la tasa de uso y el nivel de stock actual."),
    suggestedReorderQuantity: z.number().int().describe("Una cantidad de recompra sugerida para mantener niveles de stock saludables."),
});
export type InventoryRecommendation = z.infer<typeof InventoryRecommendationSchema>;

const AnalyzeInventoryOutputSchema = z.object({
    recommendations: z.array(InventoryRecommendationSchema),
});
export type AnalyzeInventoryOutput = z.infer<typeof AnalyzeInventoryOutputSchema>;

// --- Exported Function for UI ---

export async function analyzeInventory(input: AnalyzeInventoryInput): Promise<AnalyzeInventoryOutput> {
  return analyzeInventoryFlow(input);
}


// --- AI Prompt and Flow Implementation ---

const analyzeInventoryPrompt = ai.definePrompt({
  name: 'analyzeInventoryPrompt',
  input: { schema: AnalyzeInventoryInputSchema },
  output: { schema: AnalyzeInventoryOutputSchema },
  prompt: `Eres un experto gestor de inventario para un taller mecánico. Tu tarea es analizar el inventario actual y su uso histórico para proporcionar recomendaciones de reabastecimiento accionables.

**Instrucciones:**
1.  **Analiza el Consumo:** Revisa la lista de \`serviceRecords\`. Cada registro indica qué artículos se usaron (\`supplyName\`) y cuándo. Calcula la tasa de consumo de cada artículo (ej. unidades por mes). Considera un mes como 30 días.
2.  **Compara con el Stock Actual:** Para cada artículo en \`inventoryItems\`, compara su \`quantity\` actual con su \`lowStockThreshold\` (umbral de stock bajo) y su tasa de consumo.
3.  **Genera Recomendaciones Clave:** Debes generar una recomendación SOLAMENTE para los artículos que cumplan una de estas condiciones:
    *   Su cantidad actual está en o por debajo de su umbral de stock bajo.
    *   Se proyecta que se agotarán en el próximo mes basándote en su consumo histórico.
    *   Si no hay historial de uso para un artículo pero está por debajo de su umbral, también recomiéndalo.
4.  **No Incluir Items Saludables:** Para todos los demás artículos con stock saludable y bajo consumo, NO generes una recomendación. El resultado debe estar enfocado en acciones urgentes.
5.  **Cálculo de Recompra:** Para cada recomendación, sugiere una cantidad a reordenar (\`suggestedReorderQuantity\`). Una buena regla general es pedir lo suficiente para cubrir 2-3 meses de consumo promedio, redondeado a un número entero. Si no hay historial, sugiere una cantidad que lo lleve al doble de su umbral de stock bajo.
6.  **Justificación Clara:** Proporciona un razonamiento claro y conciso para cada recomendación.

**Datos de Inventario:**
{{json inventoryItems}}

**Historial de Uso en Servicios:**
{{json serviceRecords}}

Ahora, devuelve tus recomendaciones en el formato JSON especificado. Recuerda, solo los artículos que necesiten atención.
`,
});

const analyzeInventoryFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryFlow',
    inputSchema: AnalyzeInventoryInputSchema,
    outputSchema: AnalyzeInventoryOutputSchema,
  },
  async (input) => {
    // The prompt now receives the full context with item names, so no complex pre-processing is needed.
    // The AI is tasked with the full analysis.
    const { output } = await analyzeInventoryPrompt(input, {
        config: { temperature: 0.1 } // Low temperature for more deterministic, rule-based output
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
