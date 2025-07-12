
'use server';
/**
 * @fileOverview An AI flow to migrate historical service data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedServiceSchema = z.object({
  vehicleLicensePlate: z.string().describe('The license plate of the vehicle that received the service. This is mandatory for linking the service.'),
  serviceDate: z.string().describe('The date the service was performed. Must be a valid date format (e.g., YYYY-MM-DD, MM/DD/YY).'),
  description: z.string().default('').describe('A brief description of the service performed.'),
  totalCost: z.coerce.number().default(0).describe('The total cost charged for the service.'),
});
export type ExtractedService = z.infer<typeof ExtractedServiceSchema>;

const ServiceMigrationInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
  mapping: z.string().describe('A JSON string representing the mapping from CSV headers to required fields. Example: {"vehicleLicensePlate": "Placa del Coche", "serviceDate": "Fecha"}'),
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
  prompt: `You are a data migration specialist for an auto repair shop. Your task is to analyze the provided CSV-formatted text and extract service history information, using a predefined column mapping.

**Instructions:**
1.  **Use the Provided Mapping**: You have been given a JSON mapping object that tells you exactly which CSV column corresponds to each required data field. You MUST adhere to this mapping.
    *   Mapping: {{{mapping}}}
2.  **Extract Data**: For each row in the CSV, create one service object in the 'services' array using the headers defined in the mapping.
3.  **Mandatory Fields**: Every service record MUST have a valid 'vehicleLicensePlate', 'serviceDate', 'description', and 'totalCost'. If a row is missing data in a column that is mapped to a mandatory field, you must ignore that row entirely.
4.  **Clean and Format Data**:
    *   Trim whitespace from all text fields.
    *   Convert 'totalCost' to a number. Ensure 'serviceDate' is preserved in its original format from the CSV.
    *   **Format the 'description' to start with a capital letter and have correct sentence casing.**
    *   **Format 'vehicleLicensePlate' to be uppercase and remove any extra characters or spaces.**
5.  **Default Values**: If a field is empty or missing in the source data, you MUST return it with a default value: an empty string ("") for 'description', and 0 for 'totalCost'. Do not omit fields.

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
