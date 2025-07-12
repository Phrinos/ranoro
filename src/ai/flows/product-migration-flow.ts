
'use server';
/**
 * @fileOverview An AI flow to migrate inventory product data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedProductSchema = z.object({
  sku: z.string().default('').describe('The SKU or product code.'),
  name: z.string().describe('The name of the product. This is a mandatory field.'),
  quantity: z.coerce.number().default(0).describe('The current stock quantity.'),
  unitPrice: z.coerce.number().default(0).describe('The purchase price for the workshop.'),
  sellingPrice: z.coerce.number().default(0).describe('The selling price to the customer.'),
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

**Instructions:**
1.  **Identify Columns**: Intelligently map the columns from the CSV to the required fields. Common mappings are:
    *   'nombre', 'producto', 'descripción' -> 'name' (MANDATORY)
    *   'codigo', 'sku', 'clave' -> 'sku'
    *   'existencias', 'cantidad', 'stock', 'cant.' -> 'quantity'
    *   'precio de compra', 'costo', 'precio compra' -> 'unitPrice'
    *   'precio de venta', 'precio publico', 'precio venta' -> 'sellingPrice'
2.  **Extract Data**: For each row in the CSV, create one product object.
3.  **Mandatory Name**: The 'name' field is absolutely mandatory. If a row does not have a value that can be identified as a product name, you must ignore that row.
4.  **Clean and Format Data**: 
    *   Trim whitespace from all text fields.
    *   Convert numbers correctly, treating missing or non-numeric values as 0.
    *   **Crucially, format text fields like 'name' and 'sku' to be consistent. For example, 'name' should be in Title Case (e.g., "Filtro De Aceite" instead of "filtro de aceite" or "FILTRO DE ACEITE").**
5.  **Default Values**: If a field is empty or missing in the source data, you MUST return it with a default value: an empty string ("") for text fields (like 'sku'), and 0 for numeric fields (like 'quantity' or prices). Do not omit fields.

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
