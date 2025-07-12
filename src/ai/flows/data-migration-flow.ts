
'use server';
/**
 * @fileOverview An AI flow to migrate historical vehicle and service data from CSV-formatted text.
 *
 * - migrateData: A function that takes CSV-formatted text and returns structured vehicle and service data.
 * - MigrateDataInput: The input type for the migrateData function.
 * - MigrateDataOutput: The return type for the migrateData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema for a single vehicle extracted from the data
const ExtractedVehicleSchema = z.object({
  licensePlate: z.string().describe('The license plate of the vehicle. This is a crucial, unique identifier. This field is mandatory and must be extracted.'),
  make: z.string().describe('The make or brand of the vehicle (e.g., Ford, Nissan).'),
  model: z.string().describe('The model of the vehicle (e.g., F-150, Sentra).'),
  year: z.number().describe('The manufacturing year of the vehicle.'),
  ownerName: z.string().describe("The full name of the vehicle's owner."),
  ownerPhone: z.string().optional().describe("The owner's contact phone number."),
});
export type ExtractedVehicle = z.infer<typeof ExtractedVehicleSchema>;

// Schema for a single service record extracted from the data
const ExtractedServiceSchema = z.object({
  vehicleLicensePlate: z.string().describe('The license plate of the vehicle that received the service.'),
  serviceDate: z.string().describe('The date the service was performed, in YYYY-MM-DD format.'),
  description: z.string().describe('A brief description of the service performed.'),
  totalCost: z.number().describe('The total cost charged for the service.'),
});
export type ExtractedService = z.infer<typeof ExtractedServiceSchema>;

// Input schema for the migration flow
const MigrateDataInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
});
export type MigrateDataInput = z.infer<typeof MigrateDataInputSchema>;

// Output schema for the migration flow
const MigrateDataOutputSchema = z.object({
  vehicles: z.array(ExtractedVehicleSchema).describe('A list of unique vehicles found in the data. Do not create duplicate vehicles for the same license plate.'),
  services: z.array(ExtractedServiceSchema).describe('A list of all service records found in the data.'),
});
export type MigrateDataOutput = z.infer<typeof MigrateDataOutputSchema>;

/**
 * An AI-powered function to parse vehicle and service data from CSV-formatted text.
 * @param input The CSV content as a string.
 * @returns A promise that resolves to structured vehicle and service data.
 */
export async function migrateData(input: MigrateDataInput): Promise<MigrateDataOutput> {
  return migrateDataFlow(input);
}

const migrateDataPrompt = ai.definePrompt({
  name: 'migrateDataPrompt',
  input: { schema: MigrateDataInputSchema },
  output: { schema: MigrateDataOutputSchema },
  prompt: `You are an expert data migration specialist for an auto repair shop. Your task is to analyze the provided CSV-formatted text and extract vehicle and service information.

**CRITICAL INSTRUCTIONS:**
1.  **EXTRACT THE LICENSE PLATE (PLACA)**: The 'licensePlate' field is the most important piece of information and is **MANDATORY**. Look for columns named 'Placa', 'Patente', 'Matrícula', or 'LicensePlate'. You MUST extract this value for every vehicle. If a row does not seem to have a license plate, it is not a valid vehicle record.
2.  **Identify Unique Vehicles**: Based on the extracted license plate, create only ONE vehicle entry in the 'vehicles' array for each unique license plate. Use the information from the most complete row for that vehicle.
3.  **Extract All Services**: Create a service entry in the 'services' array for EVERY service record you find. Each service must be linked to a vehicle via its 'vehicleLicensePlate'.
4.  **Handle Data Variations**: The CSV column headers might vary. Be flexible. Look for headers like 'Marca'/'Make', 'Modelo'/'Model', 'Año'/'Year', 'Cliente'/'OwnerName', 'Fecha'/'Date', 'Descripción'/'Description', 'Costo'/'Total'.
5.  **Data Cleaning**: Clean up the data. Trim whitespace. Convert years and costs to numbers. Ensure dates are in YYYY-MM-DD format. If a value is missing for an optional field like 'ownerPhone', omit it.

Analyze the following CSV-formatted content and return the data in the specified JSON format.

CSV Content:
\`\`\`csv
{{{csvContent}}}
\`\`\`
`,
});

const migrateDataFlow = ai.defineFlow(
  {
    name: 'migrateDataFlow',
    inputSchema: MigrateDataInputSchema,
    outputSchema: MigrateDataOutputSchema,
  },
  async (input) => {
    const { output } = await migrateDataPrompt(input, {
        config: { temperature: 0.1 } // Lower temperature for more deterministic data extraction
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
