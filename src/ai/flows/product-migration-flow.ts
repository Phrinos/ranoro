'use server';
/**
 * @fileOverview An AI flow to migrate inventory product data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedProductSchema = z.object({
  sku: z.string().optional().describe('The SKU or product code.'),
  name: z.string().describe('The name of the product.'),
  quantity: z.number().describe('The current stock quantity.'),
  unitPrice: z.number().describe('The purchase price for the workshop.'),
  sellingPrice: z.number().describe('The selling price to the customer.'),
});
export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;


const ProductMigrationInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
});

const ProductMigrationOutputSchema = z.object({
  products: z.array(ExtractedProductSchema).describe('A list of products found in the data.'),
});
export type ProductMigrationOutput = z.infer<typeof ProductMigrationOutputSchema>;


export async function migrateProducts(input: z.infer<typeof ProductMigrationInputSchema>): Promise<ProductMigrationOutput> {
  return migrateProductsFlow(input);
}

const migrateProductsPrompt = ai.definePrompt({
  name: 'migrateProductsPrompt',
  input: { schema: ProductMigrationInputSchema },
  output: { schema: ProductMigrationOutputSchema },
  prompt: `You are a data migration specialist. Your task is to analyze the provided CSV-formatted text and extract inventory product information.

The CSV will have columns for 'codigo', 'nombre', 'existencias', 'precio de compra', and 'precio de venta'. You must map these to 'sku', 'name', 'quantity', 'unitPrice', and 'sellingPrice' respectively.

- Clean up the data: trim whitespace, convert numbers correctly.
- For each row in the CSV, create one product object.

Analyze the following CSV content and return the data in the specified JSON format.

CSV Content:
\`\`\`csv
{{{csvContent}}}
\`\`\`
`,
});

const migrateProductsFlow = ai.defineFlow(
  {
    name: 'migrateProductsFlow',
    inputSchema: ProductMigrationInputSchema,
    outputSchema: ProductMigrationOutputSchema,
  },
  async (input) => {
    const { output } = await migrateProductsPrompt(input, {
        config: { temperature: 0.1 }
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
