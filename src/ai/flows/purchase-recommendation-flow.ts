
'use server';
/**
 * @fileOverview An AI flow to generate a consolidated purchase order for scheduled services.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Schemas for Input ---

const ScheduledServiceSchema = z.object({
  id: z.string(),
  description: z.string().describe("The description of a service scheduled for today."),
});

const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().describe("Current quantity in stock."),
  supplier: z.string().describe("The name of the supplier for this item."),
});

const ServiceHistoryItemSchema = z.object({
  description: z.string().describe("The description of a past service."),
  suppliesUsed: z.array(z.object({
    supplyName: z.string().describe("The name of the supply/part used."),
  })).describe("A list of supplies used in the past service."),
});

const PurchaseRecommendationInputSchema = z.object({
  scheduledServices: z.array(ScheduledServiceSchema).describe("A list of all services scheduled for today that need parts."),
  inventoryItems: z.array(InventoryItemSchema).describe("The current list of all inventory items to check stock and supplier."),
  serviceHistory: z.array(ServiceHistoryItemSchema).describe("A comprehensive history of past services to learn which parts are needed for which job."),
});
export type PurchaseRecommendationInput = z.infer<typeof PurchaseRecommendationInputSchema>;

// --- Schemas for Output ---

const PurchaseItemSchema = z.object({
  itemName: z.string().describe("The name of the item to purchase."),
  quantity: z.number().int().describe("The quantity of the item to purchase."),
  serviceId: z.string().describe("The ID of the service this item is for."),
  inventoryId: z.string().describe("The ID of the corresponding inventory item."),
});

const SupplierPurchaseListSchema = z.object({
  supplier: z.string().describe("The name of the supplier from whom to purchase the items."),
  items: z.array(PurchaseItemSchema),
});

const PurchaseRecommendationOutputSchema = z.object({
  recommendations: z.array(SupplierPurchaseListSchema).describe("The final purchase list, grouped by supplier."),
  reasoning: z.string().describe("A brief summary of the process, mentioning number of services analyzed and items needed."),
});
export type PurchaseRecommendationOutput = z.infer<typeof PurchaseRecommendationOutputSchema>;


export async function getPurchaseRecommendations(input: PurchaseRecommendationInput): Promise<PurchaseRecommendationOutput> {
  return purchaseRecommendationFlow(input);
}


const purchaseRecommendationPrompt = ai.definePrompt({
  name: 'purchaseRecommendationPrompt',
  input: { schema: PurchaseRecommendationInputSchema },
  output: { schema: PurchaseRecommendationOutputSchema },
  prompt: `You are an expert parts manager for an auto repair shop. Your task is to create a consolidated purchase list based on today's scheduled services, the current inventory, and past service history.

**Instructions:**

1.  **Analyze Today's Services:** For each service in the \`scheduledServices\` list, determine what parts and materials are likely needed. Use the \`serviceHistory\` as your primary reference. For example, a "Cambio de aceite y filtro" historically uses "Aceite Sintetico 5W-30" and "Filtro de Aceite".
2.  **Check Stock Levels:** For each part you predict is needed, look it up in the \`inventoryItems\` list. If the current \`quantity\` is sufficient (e.g., greater than 0), you DO NOT need to order it. If the stock is zero or insufficient, add it to the purchase list.
3.  **Consolidate and Group:** Create a final purchase list. Group all the items that need to be purchased by their \`supplier\`.
4.  **Format Output:** For each item in the purchase list, specify the item's name, the required quantity (usually 1 unless the service description implies more, like "cambio de 4 bujias"), the ID of the service it's for, and the inventory ID of the item.
5.  **Reasoning:** Provide a brief summary of your work.

**Example Reasoning:** "Based on the 5 services scheduled, I've identified 8 parts that are out of stock. The purchase list is grouped by the 2 necessary suppliers."

**Data Provided:**
- **Scheduled Services:** {{json scheduledServices}}
- **Current Inventory:** {{json inventoryItems}}
- **Service History for Learning:** {{json serviceHistory}}

Now, generate the consolidated purchase order in the specified JSON format.
`,
});

const purchaseRecommendationFlow = ai.defineFlow(
  {
    name: 'purchaseRecommendationFlow',
    inputSchema: PurchaseRecommendationInputSchema,
    outputSchema: PurchaseRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await purchaseRecommendationPrompt.generate({
        input,
        config: { temperature: 0.1 }
    });
    
    if (!output) {
      throw new Error("AI failed to provide purchase recommendations.");
    }

    return output;
  }
);
