'use server';
/**
 * @fileOverview An AI flow to suggest a full quote (supplies and price) for a vehicle service based on historical data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schemas are not exported directly from a "use server" file.
const VehicleInfoSchema = z.object({
  make: z.string().describe('The make or brand of the vehicle.'),
  model: z.string().describe('The model of the vehicle.'),
  year: z.number().describe('The manufacturing year of the vehicle.'),
});

const ServiceHistoryItemSchema = z.object({
  description: z.string().describe("The description of a past service."),
  suppliesUsed: z.array(z.object({
    supplyName: z.string().describe("The name of the supply/part used."),
    quantity: z.number().describe("The quantity of the supply used."),
  })).describe("A list of supplies used in the past service."),
  totalCost: z.number().describe("The final price charged to the customer for the past service."),
});

const InventoryItemSchema = z.object({
    id: z.string().describe("The unique ID of the inventory item."),
    name: z.string().describe("The name of the inventory item."),
    sellingPrice: z.number().describe("The current selling price of the item to the customer (tax-inclusive)."),
});

const QuoteSuggestionInputSchema = z.object({
  vehicleInfo: VehicleInfoSchema.describe("Details of the vehicle needing the service."),
  serviceDescription: z.string().describe("The customer's description of the service needed."),
  serviceHistory: z.array(ServiceHistoryItemSchema).describe("A list of past services and quotes to use as a reference."),
  inventory: z.array(InventoryItemSchema).describe("The list of currently available inventory items with their IDs and prices."),
});
export type QuoteSuggestionInput = z.infer<typeof QuoteSuggestionInputSchema>;


const QuoteSuggestionOutputSchema = z.object({
  suppliesProposed: z.array(z.object({
    supplyId: z.string().describe("The ID of the suggested inventory item."),
    quantity: z.number().int().describe("The suggested quantity for this item."),
  })).describe("A list of suggested supplies for the quote."),
  estimatedTotalCost: z.number().describe("The final suggested price for the customer, inclusive of parts, labor, profit, and tax."),
  reasoning: z.string().describe("A brief explanation of how the quote was generated, referencing historical data and labor estimates."),
});
export type QuoteSuggestionOutput = z.infer<typeof QuoteSuggestionOutputSchema>;

export async function suggestQuote(input: QuoteSuggestionInput): Promise<QuoteSuggestionOutput> {
  return suggestQuoteFlow(input);
}

const suggestQuotePrompt = ai.definePrompt({
  name: 'suggestQuotePrompt',
  input: { schema: QuoteSuggestionInputSchema },
  output: { schema: QuoteSuggestionOutputSchema },
  prompt: `You are an expert auto repair service advisor for a workshop named "Ranoro". Your task is to generate a detailed and profitable price quote based on a customer's service request and the workshop's historical data.

**Analysis Steps:**
1.  **Analyze the Request:** The customer needs the following service: "{{serviceDescription}}" for their {{vehicleInfo.year}} {{vehicleInfo.make}} {{vehicleInfo.model}}.
2.  **Review Historical Data:** Examine the provided service history to find similar jobs on comparable vehicles. Pay close attention to the parts used ('suppliesUsed') and the final prices charged ('totalCost') in those historical records. This is your primary source for determining the scope of work and pricing.
3.  **Select Parts from Inventory:** Based on your analysis of the service description and historical data, identify the necessary parts from the provided current 'inventory' list. You MUST use the exact 'id' from the inventory for each part you propose in the 'suppliesProposed' output.
4.  **Calculate Final Price:** Determine a final 'estimatedTotalCost'. This price must be fair, competitive, and profitable. It should account for:
    *   The total cost of the parts you selected (using their 'sellingPrice' from the inventory).
    *   An estimated labor cost based on the complexity of the service description.
    *   Consistency with the final prices from similar jobs in the service history.
5.  **Provide Reasoning:** Briefly explain your reasoning. Mention which historical data points were most influential and how you arrived at the final price.

**Data Provided:**
- **Current Request:** "{{serviceDescription}}"
- **Vehicle:** {{vehicleInfo.year}} {{vehicleInfo.make}} {{vehicleInfo.model}}
- **Service History:** A list of past jobs.
- **Available Inventory:** A list of parts with their IDs and current selling prices.

Now, generate the quote in the specified JSON format.
`,
});

const suggestQuoteFlow = ai.defineFlow(
  {
    name: 'suggestQuoteFlow',
    inputSchema: QuoteSuggestionInputSchema,
    outputSchema: QuoteSuggestionOutputSchema,
  },
  async (input) => {
    const llmResponse = await suggestQuotePrompt.generate({
        input,
        config: { temperature: 0.3 }
    });
    
    const output = llmResponse.output();
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
