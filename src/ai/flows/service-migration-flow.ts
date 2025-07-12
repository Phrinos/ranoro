
'use server';
/**
 * @fileOverview An AI flow to migrate historical service data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedServiceSchema = z.object({
  vehicleLicensePlate: z.string().describe('The license plate of the vehicle that received the service. This is mandatory for linking the service.'),
  serviceDate: z.string().describe('The date the service was performed. Must be a valid date format (e.g., YYYY-MM-DD, MM/DD/YY).'),
  description: z.string().describe('A brief description of the service performed.'),
  totalCost: z.coerce.number().describe('The total cost charged for the service.'),
});
export type ExtractedService = z.infer<typeof ExtractedServiceSchema>;

const ServiceMigrationInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
});

const ServiceMigrationOutputSchema = z.object({
  services: z.array(ExtractedServiceSchema).describe('A list of service records found in the data.'),
});
export type ServiceMigrationOutput = z.infer<typeof ServiceMigrationOutputSchema>;

export async function migrateServices(input: z.infer<typeof ServiceMigrationInputSchema>): Promise<ServiceMigrationOutput> {
  return migrateServicesFlow(input);
}

const migrateServicesPrompt = ai.definePrompt({
  name: 'migrateServicesPrompt',
  input: { schema: ServiceMigrationInputSchema },
  output: { schema: ServiceMigrationOutputSchema },
  prompt: `You are a data migration specialist for an auto repair shop. Your task is to analyze the provided CSV-formatted text and extract service history information.

**Instructions:**
1.  **Identify Columns**: Intelligently map the columns from the CSV to the required fields. Common mappings are:
    *   'Placa', 'Patente' -> 'vehicleLicensePlate' (MANDATORY)
    *   'Fecha', 'Date' -> 'serviceDate' (MANDATORY)
    *   'Descripción', 'Trabajo Realizado', 'Concepto' -> 'description' (MANDATORY)
    *   'Costo', 'Total', 'Importe' -> 'totalCost' (MANDATORY)
2.  **Extract Data**: For each row in the CSV that represents a service, create one service object in the 'services' array.
3.  **Mandatory Fields**: Every service record MUST have a valid 'vehicleLicensePlate', 'serviceDate', 'description', and 'totalCost'. If a row is missing any of these critical pieces of information, you must ignore that row entirely.
4.  **Clean Data**: Trim whitespace from all text fields. Convert 'totalCost' to a number. Ensure 'serviceDate' is preserved in its original format from the CSV.

Analyze the following CSV content and return the data in the specified JSON format.

CSV Content:
\`\`\`csv
{{{csvContent}}}
\`\`\`
`,
});

const migrateServicesFlow = ai.defineFlow(
  {
    name: 'migrateServicesFlow',
    inputSchema: ServiceMigrationInputSchema,
    outputSchema: ServiceMigrationOutputSchema,
  },
  async (input) => {
    const { output } = await migrateServicesPrompt(input, {
        config: { temperature: 0.0 }
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
