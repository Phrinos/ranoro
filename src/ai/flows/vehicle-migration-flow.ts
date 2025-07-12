
'use server';
/**
 * @fileOverview An AI flow to migrate vehicle data from CSV-formatted text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedVehicleSchema = z.object({
  licensePlate: z.string().describe('The license plate of the vehicle. This is a crucial, unique identifier. It is mandatory.'),
  make: z.string().default('').describe('The make or brand of the vehicle (e.g., Ford, Nissan).'),
  model: z.string().default('').describe('The model of the vehicle (e.g., F-150, Sentra).'),
  year: z.coerce.number().default(0).describe('The manufacturing year of the vehicle.'),
  ownerName: z.string().default('').describe("The full name of the vehicle's owner."),
  ownerPhone: z.string().default('').describe("The owner's contact phone number."),
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
  prompt: `You are a data migration specialist for a vehicle database. Your task is to analyze the provided CSV-formatted text and extract vehicle information.

**Instructions:**
1.  **Identify Columns**: Map the columns from the CSV to the required fields. Common mappings are:
    *   'Placa', 'Patente' -> 'licensePlate' (MANDATORY)
    *   'Marca' -> 'make'
    *   'Modelo' -> 'model'
    *   'Año', 'Anio' -> 'year'
    *   'Propietario', 'Cliente', 'Nombre' -> 'ownerName'
    *   'Teléfono', 'Telefono' -> 'ownerPhone'
2.  **Extract Data**: For each row in the CSV, create one vehicle object.
3.  **Mandatory License Plate**: The 'licensePlate' field is absolutely mandatory. If a row does not have a value that can be identified as a license plate, you must ignore that row entirely. A license plate is typically 6 to 8 alphanumeric characters.
4.  **Clean and Format Data**:
    *   Trim whitespace from all text fields.
    *   Convert 'year' to a number.
    *   **CRITICAL: Format text fields like 'make', 'model', and 'ownerName' to be consistently capitalized in "Title Case". For example, "NISSAN" or "nissan" should both become "Nissan". "JUAN PEREZ" should become "Juan Perez".**
    *   **Format 'licensePlate' to be uppercase and remove any extra characters or spaces.**
5.  **Default Values**: If a field (other than the mandatory licensePlate) is empty or missing, you MUST return it with a default value: an empty string ("") for text fields (like 'make', 'model'), and 0 for the 'year' field. Do not omit fields from the JSON output.

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
        config: { temperature: 0.0 }
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
