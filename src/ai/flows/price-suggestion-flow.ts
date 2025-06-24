
'use server';
/**
 * @fileOverview An AI flow to suggest a price for a vehicle service.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SupplyInputSchema = z.object({
  supplyName: z.string().describe("The name of the supply/part used."),
  quantity: z.number().describe("The quantity of the supply used."),
  unitPrice: z.number().describe("The cost of a single unit of this supply to the workshop."),
});

const SuggestPriceInputSchema = z.object({
  description: z.string().describe("The description of the service to be performed."),
  supplies: z.array(SupplyInputSchema).describe("A list of supplies and parts to be used in the service."),
  totalSuppliesCost: z.number().describe("The total cost of all supplies for the workshop."),
});
export type SuggestPriceInput = z.infer<typeof SuggestPriceInputSchema>;

const SuggestPriceOutputSchema = z.object({
  suggestedPrice: z.number().describe("The final suggested price for the customer, inclusive of labor, profit, and 16% IVA tax."),
  reasoning: z.string().describe("A brief explanation of how the price was determined, mentioning labor, complexity, and parts cost."),
});
export type SuggestPriceOutput = z.infer<typeof SuggestPriceOutputSchema>;

export async function suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceOutput> {
  return suggestPriceFlow(input);
}

const suggestPricePrompt = ai.definePrompt({
  name: 'suggestPricePrompt',
  input: { schema: SuggestPriceInputSchema },
  output: { schema: SuggestPriceOutputSchema },
  prompt: `You are an expert auto repair shop manager responsible for pricing services. Your task is to suggest a final, fair, and profitable price for a customer.

Consider the following factors:
1.  **Cost of Parts:** The total cost of all parts and supplies for the workshop is {{totalSuppliesCost}}.
2.  **Labor:** Estimate the labor cost based on the complexity of the service description: "{{description}}". A simple oil change might be 0.5-1 hour of labor, while a more complex job like a transmission repair could be many hours. Assume a standard labor rate of $500 MXN per hour.
3.  **Profit Margin:** Apply a healthy profit margin on top of the combined parts and labor cost. A good margin is typically between 40% and 60% of the parts and labor cost.
4.  **IVA Tax:** The final price MUST be inclusive of a 16% IVA tax.

Calculate the final price and provide a brief reasoning for your suggestion.

**Service Details:**
- Description: {{description}}
- Total Parts Cost (for workshop): {{totalSuppliesCost}}
- Parts Used:
  {{#each supplies}}
  - {{quantity}} x {{supplyName}} (Costo: \${{unitPrice}})
  {{/each}}

Provide the final price and reasoning in the specified JSON format. The final price should be a single number.
`,
});

const suggestPriceFlow = ai.defineFlow(
  {
    name: 'suggestPriceFlow',
    inputSchema: SuggestPriceInputSchema,
    outputSchema: SuggestPriceOutputSchema,
  },
  async (input) => {
    const { output } = await suggestPricePrompt(input, {
        config: { temperature: 0.3 }
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
