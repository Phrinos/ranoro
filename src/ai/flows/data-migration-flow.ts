
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
  serviceDate: z.string().describe("The date the service was performed. It is CRITICAL to preserve the original format from the source data (e.g., '1/31/25', '31-Ene-2025'). DO NOT reformat it to 'YYYY-MM-DD'."),
  description: z.string().default('').describe('A brief description of the service performed.'),
  totalCost: z.coerce.number().default(0).describe('The total cost charged for the service.'),
});
export type ExtractedService = z.infer<typeof ExtractedServiceSchema>;

// Input schema for the migration flow
const MigrateDataInputSchema = z.object({
  csvContent: z.string().describe('The full string content of a spreadsheet sheet, formatted as CSV.'),
  existingLicensePlates: z.array(z.string()).optional().describe('A list of license plates that already exist in the database. These should be omitted from the output.'),
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

**Step 0: Check for Existing Records.**
You have been provided with a list of license plates that already exist in the database: \`{{json existingLicensePlates}}\`.
- **CRITICAL**: When you extract a license plate from the CSV, you MUST check if it exists in the \`existingLicensePlates\` list.
- If the license plate ALREADY EXISTS, you MUST IGNORE that vehicle. Do NOT include it in the final 'vehicles' output array.
- You can still process services associated with that existing license plate, but the vehicle itself should not be created again.

**Step 1: Identify the License Plate Column.**
This is the most critical step. The license plate ('placa') is the MANDATORY, UNIQUE IDENTIFIER for every vehicle.
- First, look for a column header that is explicitly named 'Placa', 'Patente', 'Matrícula', or 'LicensePlate'.
- If no such header exists, analyze the data in each column. The license plate column will contain values that are typically 6 to 8 characters long, consisting of a mix of uppercase letters and numbers.
- Once you have identified the license plate column, you MUST use it as the source for the 'licensePlate' field for vehicles and the 'vehicleLicensePlate' field for services. If you cannot identify a license plate column, do not proceed and return an empty result.

**Step 2: Extract and Consolidate Unique NEW Vehicles.**
- Iterate through each row of the CSV.
- For each row, extract the license plate.
- **Check if this license plate is in the \`existingLicensePlates\` list. If it is, SKIP creating a vehicle for this row.**
- If the license plate is new (not in the existing list) and you encounter it for the first time in this CSV, create a new vehicle object in the 'vehicles' array.
- If you see a new license plate that you already added to your 'vehicles' array *during this session*, DO NOT create a new vehicle. You can update the existing record if the current row has more complete information.

**Step 3: Extract All Service Records.**
- For EVERY row in the CSV that represents a service, create a corresponding entry in the 'services' array.
- Each service record MUST be linked to a vehicle via its 'vehicleLicensePlate', using the value from the column identified in Step 1.
- Extract service details like 'Fecha'/'Date' for 'serviceDate', 'Descripción'/'Description'/'Concepto de la reparacion' for 'description', and 'Costo'/'Total'/'COSTO TOTAL' for 'totalCost'.

**Step 4: Clean and Format Data.**
- **Clean the data as you extract it: trim whitespace, convert years and costs to numbers.**
- **CRITICAL: PRESERVE DATE FORMAT.** For the 'serviceDate' field, you MUST extract the date exactly as it appears in the source CSV (e.g., '31/01/2025', '1/31/25'). Do NOT reformat it to 'YYYY-MM-DD'.
- **CRITICAL: Format all text fields to be consistently capitalized. 'make', 'model', and 'ownerName' should be in "Title Case". 'licensePlate' should be in ALL CAPS. 'description' should start with a capital letter.**
- **IMPORTANT:** If a value for a field is missing or empty, you MUST return it as an empty string ("") for text fields, or 0 for numeric fields (like year or cost). Do not omit the field from the JSON.
- **CRITICAL:** Every vehicle in the output 'vehicles' array and every service in the 'services' array must have a valid 'licensePlate' or 'vehicleLicensePlate' field, respectively. Rows without a discernible license plate should be ignored.
- **YEAR FIELD (CRITICAL):** Look for columns named 'Año' or 'Anio'. If the cell contains a numerical value (e.g., 2020, '2020), you MUST extract that number for the 'year' field. Only use 0 if the cell is completely empty or contains non-numeric text. Do not default to 0 if a year is present.

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
