
'use server';
/**
 * @fileOverview An AI flow to analyze inventory and suggest reordering actions.
 * This file has been updated to improve the context sent to the AI and to perform
 * data fetching on the server-side for better performance and reliability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { operationsService } from '@/lib/services/operations.service';

// --- Main Input Schemas (from UI) ---
const InventoryItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  quantity: z.number(),
  lowStockThreshold: z.number(),
});

const AnalyzeInventoryInputSchema = z.object({
  inventoryItems: z.array(InventoryItemInputSchema).describe("The current list of all inventory items."),
});
export type AnalyzeInventoryInput = z.infer<typeof AnalyzeInventoryInputSchema>;


// --- AI Prompt Input (Internal Processing) ---
const HistoricalUsageItemSchema = z.object({
  itemName: z.string(),
  monthlyConsumptionRate: z.number().describe("The calculated average number of units used per month."),
});

const PromptInputSchema = z.object({
    inventoryItems: z.array(InventoryItemInputSchema),
    historicalUsage: z.array(HistoricalUsageItemSchema),
});


// --- Output Schemas (for UI) ---
const InventoryRecommendationSchema = z.object({
    itemId: z.string().describe("El ID del artículo de inventario."),
    itemName: z.string().describe("El nombre del artículo de inventario."),
    itemSku: z.string().optional().describe("El SKU o código del artículo de inventario."),
    recommendation: z.string().describe("Una recomendación clara en español, p. ej., 'Reordenar ahora', 'Stock saludable', 'Nivel de stock crítico'."),
    reasoning: z.string().describe("Una breve explicación en español para la recomendación, citando la tasa de uso y el nivel de stock actual."),
    suggestedReorderQuantity: z.number().int().describe("Una cantidad de recompra sugerida para mantener niveles de stock saludables."),
});
export type InventoryRecommendation = z.infer<typeof InventoryRecommendationSchema>;

const AnalyzeInventoryOutputSchema = z.object({
    recommendations: z.array(InventoryRecommendationSchema),
});
export type AnalyzeInventoryOutput = z.infer<typeof AnalyzeInventoryOutputSchema>;


// --- Main Exported Function for UI ---
export async function analyzeInventory(input: AnalyzeInventoryInput): Promise<AnalyzeInventoryOutput> {
  return analyzeInventoryFlow(input);
}


// --- AI Prompt and Flow Implementation ---
const analyzeInventoryPrompt = ai.definePrompt({
  name: 'analyzeInventoryPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: AnalyzeInventoryOutputSchema },
  prompt: `Eres un experto gestor de inventario para un taller mecánico. Tu tarea es analizar el inventario actual y su uso histórico para proporcionar recomendaciones de reabastecimiento accionables. **TODA tu respuesta y razonamiento debe ser en español.**

**Instrucciones:**
1.  **Analiza los Datos:** Revisa \`inventoryItems\` y \`historicalUsage\`. La tasa de consumo ya ha sido calculada en unidades por mes.
2.  **Compara con el Stock Actual:** Para cada artículo en \`inventoryItems\`, compara su \`quantity\` actual con su \`lowStockThreshold\` (umbral de stock bajo) y su \`monthlyConsumptionRate\` del historial.
3.  **Genera Recomendaciones Clave:** Debes generar una recomendación SOLAMENTE para los artículos que cumplan una de estas condiciones:
    *   Su cantidad actual está en o por debajo de su umbral de stock bajo.
    *   Se proyecta que se agotarán en el próximo mes basándote en su consumo histórico.
    *   Si no hay historial de uso para un artículo pero está por debajo de su umbral, también recomiéndalo.
4.  **No Incluir Items Saludables:** Para todos los demás artículos con stock saludable y bajo consumo, NO generes una recomendación. El resultado debe estar enfocado en acciones urgentes.
5.  **Cálculo de Recompra (CRÍTICO):** Para cada recomendación, sugiere una cantidad a reordenar (\`suggestedReorderQuantity\`). Tu regla principal es la siguiente: **calcula la cantidad necesaria para cubrir entre 2 y 3 meses de consumo promedio, y redondea al número entero más cercano y práctico.** Si no hay historial de uso, sugiere una cantidad que lleve el stock al doble de su umbral de stock bajo.
6.  **Justificación Clara:** Proporciona un razonamiento claro y conciso para cada recomendación, siempre en español.
7.  **Incluir SKU:** Asegúrate de que el campo \`itemSku\` esté presente en cada recomendación si el artículo tiene uno.

**Datos de Inventario Actual:**
{{json inventoryItems}}

**Historial de Uso (calculado):**
{{json historicalUsage}}

Ahora, devuelve tus recomendaciones en el formato JSON especificado. Recuerda, solo los artículos que necesiten atención y responde todo en español.
`,
});

const analyzeInventoryFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryFlow',
    inputSchema: AnalyzeInventoryInputSchema,
    outputSchema: AnalyzeInventoryOutputSchema,
  },
  async (input) => {
    // Step 1: Fetch service records from Firestore on the server.
    const serviceRecords = await operationsService.onServicesUpdatePromise();

    // Step 2: Calculate historical usage on the server.
    const usageMap: Record<string, { totalUsed: number; dates: Date[] }> = {};
    const inventoryItemMap = new Map(input.inventoryItems.map(item => [item.id, item.name]));

    serviceRecords.forEach(record => {
      const recordDate = record.deliveryDateTime ? new Date(record.deliveryDateTime) : null;
      if (recordDate && record.serviceItems) {
        record.serviceItems.forEach(item => {
          if (item.suppliesUsed) {
            item.suppliesUsed.forEach(supply => {
              if (supply.supplyId && !supply.isService) {
                const itemName = inventoryItemMap.get(supply.supplyId);
                if (itemName) {
                    if (!usageMap[itemName]) {
                        usageMap[itemName] = { totalUsed: 0, dates: [] };
                    }
                    usageMap[itemName].totalUsed += supply.quantity;
                    usageMap[itemName].dates.push(recordDate);
                }
              }
            });
          }
        });
      }
    });

    const historicalUsage: z.infer<typeof HistoricalUsageItemSchema>[] = Object.entries(usageMap).map(([itemName, data]) => {
        const firstDate = new Date(Math.min(...data.dates.map(d => d.getTime())));
        const lastDate = new Date(Math.max(...data.dates.map(d => d.getTime())));
        const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1;
        const monthlyConsumptionRate = data.totalUsed / Math.max(1, monthsDiff);
        return { itemName, monthlyConsumptionRate: parseFloat(monthlyConsumptionRate.toFixed(2)) };
    });

    // Step 3: Call the AI with the processed data.
    const promptInput = {
      inventoryItems: input.inventoryItems,
      historicalUsage: historicalUsage,
    };
    
    const { output } = await analyzeInventoryPrompt(promptInput, {
        config: { temperature: 0.1 } // Low temperature for more deterministic, rule-based output
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
