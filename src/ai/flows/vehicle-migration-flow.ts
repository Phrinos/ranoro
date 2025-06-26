'use server';
/**
 * @fileOverview An AI flow to migrate vehicle data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedVehicleSchema = z.object({
  make: z.string().describe('The make or brand of the vehicle (e.g., Ford, Nissan).'),
  model: z.string().describe('The model of the vehicle (e.g., F-150, Sentra).'),
  year: z.number().describe('The manufacturing year of the vehicle.'),
  ownerName: z.string().describe("The full name of the vehicle's owner."),
  ownerPhone: z.string().describe("The owner's contact phone number."),
});
export type ExtractedVehicleForMigration = z.infer<typeof ExtractedVehicleSchema>;

const VehicleMigrationInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
});

const VehicleMigrationOutputSchema = z.object({
  vehicles: z.array(ExtractedVehicleSchema).describe('A list of vehicles found in the data.'),
});
export type VehicleMigrationOutput = z.infer<typeof VehicleMigrationOutputSchema>;

export async function migrateVehicles(input: z.infer<typeof VehicleMigrationInputSchema>): Promise<VehicleMigrationOutput> {
  return migrateVehiclesFlow(input);
}

const migrateVehiclesPrompt = ai.definePrompt({
  name: 'migrateVehiclesPrompt',
  input: { schema: VehicleMigrationInputSchema },
  output: { schema: VehicleMigrationOutputSchema },
  prompt: `You are a data migration specialist. Your task is to analyze the provided CSV-formatted text and extract vehicle information.

The CSV will have columns for 'nombre', 'telefono', 'marca', 'modelo', and 'año'. You must map these to 'ownerName', 'ownerPhone', 'make', 'model', and 'year' respectively.

- Clean up the data: trim whitespace, convert year to a number.
- For each row in the CSV, create one vehicle object.

Analyze the following CSV content and return the data in the specified JSON format.

CSV Content:
\`\`\`csv
{{{csvContent}}}
\`\`\`
`,
});

const migrateVehiclesFlow = ai.defineFlow(
  {
    name: 'migrateVehiclesFlow',
    inputSchema: VehicleMigrationInputSchema,
    outputSchema: VehicleMigrationOutputSchema,
  },
  async (input) => {
    const { output } = await migrateVehiclesPrompt(input, {
        config: { temperature: 0.1 }
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
