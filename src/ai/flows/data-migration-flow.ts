
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
  make: z.string().default('').describe('The make or brand of the vehicle (e.g., Ford, Nissan).'),
  model: z.string().default('').describe('The model of the vehicle (e.g., F-150, Sentra).'),
  year: z.coerce.number().default(0).describe('The manufacturing year of the vehicle.'),
  ownerName: z.string().default('').describe("The full name of the vehicle's owner."),
  ownerPhone: z.string().default('').describe("The owner's contact phone number."),
});
export type ExtractedVehicle = z.infer<typeof ExtractedVehicleSchema>;

// Schema for a single service record extracted from the data
const ExtractedServiceSchema = z.object({
  vehicleLicensePlate: z.string().describe('The license plate of the vehicle that received the service.'),
  serviceDate: z.string().describe('The date the service was performed, in YYYY-MM-DD format.'),
  description: z.string().default('').describe('A brief description of the service performed.'),
  totalCost: z.coerce.number().default(0).describe('The total cost charged for the service.'),
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
  prompt: `You are an expert data migration specialist for an auto repair shop. Your task is to analyze the provided CSV-formatted text and extract vehicle and service information into a structured JSON format. Follow these steps meticulously:

**Step 1: Identify the License Plate Column.**
This is the most critical step. The license plate ('placa') is the MANDATORY, UNIQUE IDENTIFIER for every vehicle.
- First, look for a column header that is explicitly named 'Placa', 'Patente', 'Matrícula', or 'LicensePlate'.
- If no such header exists, analyze the data in each column. The license plate column will contain values that are typically 6 to 8 characters long, consisting of a mix of uppercase letters and numbers.
- Once you have identified the license plate column, you MUST use it as the source for the 'licensePlate' field for vehicles and the 'vehicleLicensePlate' field for services. If you cannot identify a license plate column, do not proceed and return an empty result.

**Step 2: Extract and Consolidate Unique Vehicles.**
- Iterate through each row of the CSV.
- For each row, extract the license plate using the column you identified in Step 1.
- If you encounter a license plate for the first time, create a new vehicle object in the 'vehicles' array.
- If you see a license plate that already exists in your 'vehicles' array, DO NOT create a new vehicle. You can update the existing vehicle record if the current row has more complete information (e.g., a phone number that was missing before).
- For each vehicle, extract other relevant information by mapping columns like 'Marca' to 'make', 'Modelo' to 'model', 'Año' to 'year', 'Cliente' to 'ownerName', etc.

**Step 3: Extract All Service Records.**
- For EVERY row in the CSV that represents a service, create a corresponding entry in the 'services' array.
- Each service record MUST be linked to a vehicle via its 'vehicleLicensePlate', using the value from the column identified in Step 1.
- Extract service details like 'Fecha'/'Date' for 'serviceDate', 'Descripción'/'Description' for 'description', and 'Costo'/'Total' for 'totalCost'.

**Step 4: Clean and Format Data.**
- **Clean the data as you extract it: trim whitespace, convert years and costs to numbers, and ensure all dates are in YYYY-MM-DD format.**
- **CRITICAL: Format all text fields to be consistently capitalized. 'make', 'model', and 'ownerName' should be in "Title Case" (e.g., "Nissan Sentra"). 'licensePlate' should be in ALL CAPS. 'description' should start with a capital letter.**
- **IMPORTANT:** If a value for a field is missing or empty, you MUST return it as an empty string ("") for text fields, or 0 for numeric fields (like year or cost). Do not omit the field from the JSON.
- **CRITICAL:** Every vehicle in the output 'vehicles' array and every service in the 'services' array must have a valid 'licensePlate' or 'vehicleLicensePlate' field, respectively. Rows without a discernible license plate should be ignored.

**CSV Data to Analyze:**
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
        config: { temperature: 0.0 } // Use zero temperature for maximum determinism and rule-following
    });
    
    if (!output) {
      throw new Error("Failed to get a valid structured response from the model.");
    }
    return output;
  }
);
