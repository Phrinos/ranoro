
'use server';
/**
 * @fileOverview An AI flow to analyze inventory and suggest reordering actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const InventoryItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  lowStockThreshold: z.number(),
});

const ServiceRecordInputSchema = z.object({
    serviceDate: z.string().describe("The date the service was performed in ISO format."),
    suppliesUsed: z.array(z.object({
        supplyId: z.string(),
        quantity: z.number(),
    })),
});

const AnalyzeInventoryInputSchema = z.object({
  inventoryItems: z.array(InventoryItemInputSchema).describe("The current list of all inventory items."),
  serviceRecords: z.array(ServiceRecordInputSchema).describe("A history of all completed service records showing parts usage."),
});
export type AnalyzeInventoryInput = z.infer<typeof AnalyzeInventoryInputSchema>;

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

export async function analyzeInventory(input: AnalyzeInventoryInput): Promise<AnalyzeInventoryOutput> {
  return analyzeInventoryFlow(input);
}

const analyzeInventoryPrompt = ai.definePrompt({
  name: 'analyzeInventoryPrompt',
  input: { schema: AnalyzeInventoryInputSchema },
  output: { schema: AnalyzeInventoryOutputSchema },
  prompt: `Eres un experto gestor de inventario para un taller mecánico. Tu tarea es analizar el inventario actual y su uso histórico para proporcionar recomendaciones de reabastecimiento accionables.

**Instrucciones:**
1.  Para cada artículo en el inventario, calcula su consumo mensual promedio basándote en los \`serviceRecords\`.
2.  Compara la \`quantity\` (cantidad) actual con el \`lowStockThreshold\` (umbral de stock bajo) y la tasa de consumo calculada.
3.  Genera una recomendación SOLAMENTE para los artículos que están en o por debajo de su umbral de stock bajo, o que se prevé que se agoten en el próximo mes. Para todos los demás artículos, no generes una recomendación.
4.  Para cada recomendación, proporciona una cantidad de recompra sugerida. Una buena regla general es pedir lo suficiente para 2-3 meses de consumo.
5.  Proporciona un razonamiento claro y conciso para cada recomendación.

**Datos Proporcionados:**
- Inventario Actual: Una lista de artículos con su cantidad actual y umbral de stock bajo.
- Historial de Servicios: Una lista de servicios que muestra qué piezas se usaron y cuándo.

Analiza los datos proporcionados y devuelve tus recomendaciones en el formato JSON especificado.
`,
});

const analyzeInventoryFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryFlow',
    inputSchema: AnalyzeInventoryInputSchema,
    outputSchema: AnalyzeInventoryOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeInventoryPrompt(input, {
        config: { temperature: 0.2 }
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
