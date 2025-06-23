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

export const AnalyzeInventoryInputSchema = z.object({
  inventoryItems: z.array(InventoryItemInputSchema).describe("The current list of all inventory items."),
  serviceRecords: z.array(ServiceRecordInputSchema).describe("A history of all completed service records showing parts usage."),
});
export type AnalyzeInventoryInput = z.infer<typeof AnalyzeInventoryInputSchema>;

export const InventoryRecommendationSchema = z.object({
    itemId: z.string().describe("The ID of the inventory item."),
    itemName: z.string().describe("The name of the inventory item."),
    recommendation: z.string().describe("A clear recommendation, e.g., 'Reordenar ahora', 'Stock saludable', 'Nivel de stock crítico'."),
    reasoning: z.string().describe("A brief explanation for the recommendation, citing usage rate and current stock level."),
    suggestedReorderQuantity: z.number().int().describe("A suggested quantity to reorder to maintain healthy stock levels."),
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
  prompt: `You are an expert inventory manager for an auto repair shop. Your task is to analyze the current inventory and its historical usage to provide actionable reordering recommendations.

**Instructions:**
1.  For each item in the inventory, calculate its average monthly consumption based on the \`serviceRecords\`.
2.  Compare the current \`quantity\` with the \`lowStockThreshold\` and the calculated consumption rate.
3.  Generate a recommendation ONLY for items that are at or below their low stock threshold, or are predicted to run out within the next month. For all other items, do not generate a recommendation.
4.  For each recommendation, provide a suggested reorder quantity. A good rule of thumb is to order enough for 2-3 months of consumption.
5.  Provide a clear, concise reasoning for each recommendation.

**Data Provided:**
- Current Inventory: A list of items with their current quantity and low stock threshold.
- Service History: A list of services showing which parts were used and when.

Analyze the provided data and return your recommendations in the specified JSON format.
`,
});

const analyzeInventoryFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryFlow',
    inputSchema: AnalyzeInventoryInputSchema,
    outputSchema: AnalyzeInventoryOutputSchema,
  },
  async (input) => {
    const llmResponse = await analyzeInventoryPrompt.generate({
        input,
        config: { temperature: 0.2 }
    });
    
    const output = llmResponse.output();
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
