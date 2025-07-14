
'use server';
/**
 * @fileOverview An AI flow to migrate inventory product data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedProductSchema = z.object({
  sku: z.string().default('').describe('The SKU or product code.'),
  name: z.string().describe('The name of the product. This is a mandatory field.'),
  brand: z.string().default('').describe('The brand or manufacturer of the product.'),
  category: z.string().default('').describe('The category for the product (e.g., Filtros, Aceites).'),
  quantity: z.coerce.number().default(0).describe('The current stock quantity.'),
  unitPrice: z.coerce.number().default(0).describe('The purchase price for the workshop.'),
  sellingPrice: z.coerce.number().default(0).describe('The selling price to the customer.'),
});
export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;


const ProductMigrationInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
  existingProductNames: z.array(z.string()).optional().describe('A list of product names that already exist in the database. These should be omitted.'),
});

const ProductMigrationOutputSchema = z.object({
  products: z.array(ExtractedProductSchema).describe('A list of new products found in the data.'),
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
0.  **Check for Existing Products**: You have a list of existing product names: \`{{json existingProductNames}}\`. If you extract a product name from the CSV that is already in this list, **you MUST ignore that row** and not include it in the output. Only extract products that are new.
1.  **Identify Columns**: Intelligently map the columns from the CSV to the required fields. Common mappings are:
    *   'nombre', 'producto', 'descripción' -> 'name' (MANDATORY)
    *   'marca', 'fabricante' -> 'brand'
    *   'categoría', 'categoria' -> 'category'
    *   'codigo', 'sku', 'clave' -> 'sku'
    *   'existencias', 'cantidad', 'stock', 'cant.' -> 'quantity'
    *   'precio de compra', 'costo', 'precio compra' -> 'unitPrice'
    *   'precio de venta', 'precio publico', 'precio venta' -> 'sellingPrice'
2.  **Extract Data**: For each row in the CSV, create one product object, but only if its name is not in the \`existingProductNames\` list.
3.  **Mandatory Name**: The 'name' field is absolutely mandatory. If a row does not have a value that can be identified as a product name, you must ignore that row.
4.  **Clean and Format Data**: 
    *   Trim whitespace from all text fields.
    *   Convert numbers correctly, treating missing or non-numeric values as 0.
    *   **Crucially, format text fields like 'name', 'brand', 'category' and 'sku' to be consistent. For example, 'name' should be in Title Case (e.g., "Filtro De Aceite" instead of "filtro de aceite" or "FILTRO DE ACEITE").**
5.  **Default Values**: If a field is empty or missing in the source data (and not mandatory), you MUST return it with a default value: an empty string ("") for text fields (like 'sku', 'brand', 'category'), and 0 for numeric fields (like 'quantity' or prices). Do not omit fields.

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
