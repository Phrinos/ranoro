
'use server';
/**
 * @fileOverview An AI flow to generate a consolidated purchase order for scheduled services.
 * This flow has been optimized:
 * 1. AI's role is simplified to only predict necessary parts based on service descriptions and history.
 * 2. TypeScript code handles the business logic of checking stock and grouping by supplier.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Schemas for Main Flow Input (from UI) ---
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


// --- Schemas for AI Prompt Input (simplified) ---
const PurchasePredictionPromptInputSchema = z.object({
    scheduledServices: z.array(ScheduledServiceSchema),
    serviceHistory: z.array(ServiceHistoryItemSchema),
});


// --- Schemas for AI Prompt Output (simplified) ---
const PredictedPartSchema = z.object({
  itemName: z.string().describe("The name of the item predicted to be needed."),
  quantity: z.number().int().describe("The quantity of the item needed. Usually 1 unless the service description implies more."),
  serviceId: z.string().describe("The ID of the service this item is for."),
});
const PredictedPartsOutputSchema = z.object({
    predictedParts: z.array(PredictedPartSchema)
});


// --- Schemas for Main Flow Output (same as before) ---
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


const purchaseRecommendationPrompt = ai.definePrompt({
  name: 'purchaseRecommendationPrompt',
  input: { schema: PurchasePredictionPromptInputSchema },
  output: { schema: PredictedPartsOutputSchema },
  prompt: `You are an expert parts manager for an auto repair shop. Your task is to determine which parts and materials are likely needed for today's scheduled services, based on past service history.

**Instructions:**
1.  **Analyze Today's Services:** For each service in the \`scheduledServices\` list, determine the parts and materials required.
2.  **Use History for Prediction:** Use the \`serviceHistory\` as your primary reference. For example, a "Cambio de aceite y filtro" historically uses "Aceite Sintetico 5W-30" and "Filtro de Aceite".
3.  **DO NOT Check Stock:** Your only job is to predict the required parts. Do not worry about current inventory levels.
4.  **Format Output:** For each part you predict is needed, specify its name, the required quantity (usually 1 unless the service description implies more, e.g., "cambio de 4 bujias"), and the ID of the service it's for.

**Data Provided:**
- **Scheduled Services:** {{json scheduledServices}}
- **Service History for Learning:** {{json serviceHistory}}

Now, generate the list of predicted parts in the specified JSON format.
`,
});

const purchaseRecommendationFlow = ai.defineFlow(
  {
    name: 'purchaseRecommendationFlow',
    inputSchema: PurchaseRecommendationInputSchema,
    outputSchema: PurchaseRecommendationOutputSchema,
  },
  async (input) => {
    // 1. Call the AI with a simplified task: just predict needed parts.
    const promptInput = {
      scheduledServices: input.scheduledServices,
      serviceHistory: input.serviceHistory,
    };

    if (promptInput.scheduledServices.length === 0) {
        return {
            recommendations: [],
            reasoning: "No hay servicios agendados para hoy que requieran análisis de compra."
        }
    }

    const { output } = await purchaseRecommendationPrompt(promptInput, {
        config: { temperature: 0.1 }
    });

    if (!output || !output.predictedParts) {
      throw new Error("AI failed to provide a prediction of required parts.");
    }
    
    // 2. Handle the business logic (stock checking) in code.
    const itemsToPurchase: (z.infer<typeof PurchaseItemSchema> & { supplier: string })[] = [];
    for (const predictedPart of output.predictedParts) {
      const inventoryItem = input.inventoryItems.find(
        item => item.name.toLowerCase() === predictedPart.itemName.toLowerCase()
      );
      
      // If the item exists in inventory and is out of stock, add it to the purchase list.
      if (inventoryItem && inventoryItem.quantity < predictedPart.quantity) {
        itemsToPurchase.push({
          itemName: inventoryItem.name,
          quantity: predictedPart.quantity,
          serviceId: predictedPart.serviceId,
          inventoryId: inventoryItem.id,
          supplier: inventoryItem.supplier,
        });
      }
    }

    // 3. Group the final list by supplier.
    const recommendationsBySupplier = itemsToPurchase.reduce((acc, item) => {
        if (!acc[item.supplier]) {
            acc[item.supplier] = { supplier: item.supplier, items: [] };
        }
        acc[item.supplier].items.push({
            itemName: item.itemName,
            quantity: item.quantity,
            serviceId: item.serviceId,
            inventoryId: item.inventoryId,
        });
        return acc;
    }, {} as Record<string, z.infer<typeof SupplierPurchaseListSchema>>);

    const reasoning = `Basado en los ${input.scheduledServices.length} servicios agendados, la IA predijo ${output.predictedParts.length} artículos necesarios. Después de verificar el stock, se determinó que ${itemsToPurchase.length} artículos necesitan ser comprados de ${Object.keys(recommendationsBySupplier).length} proveedores.`;

    return {
      recommendations: Object.values(recommendationsBySupplier),
      reasoning,
    };
  }
);


export async function getPurchaseRecommendations(input: PurchaseRecommendationInput): Promise<PurchaseRecommendationOutput> {
  return purchaseRecommendationFlow(input);
}
