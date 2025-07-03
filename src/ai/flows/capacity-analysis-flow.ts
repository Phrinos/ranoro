
'use server';
/**
 * @fileOverview An AI flow to analyze the daily capacity of the workshop.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';

const ServiceForDaySchema = z.object({
  description: z.string().describe("The description of a service scheduled for today."),
});

const TechnicianInputSchema = z.object({
  id: z.string(),
  standardHoursPerDay: z.number().default(8).describe("The standard number of workable hours for this technician in a day."),
});

const ServiceHistoryItemSchema = z.object({
  description: z.string().describe("The description of a past service."),
  serviceDate: z.string().optional().describe("The start date and time of the service in ISO format."),
  deliveryDateTime: z.string().optional().describe("The end date and time of the service in ISO format."),
});

// The input for the main flow, which is called from the UI
const CapacityAnalysisInputSchema = z.object({
  servicesForDay: z.array(ServiceForDaySchema).describe("A list of services scheduled for the day to be analyzed."),
  technicians: z.array(TechnicianInputSchema).describe("A list of all active technicians and their standard daily hours."),
  serviceHistory: z.array(ServiceHistoryItemSchema).describe("A comprehensive history of past services to learn time estimations from."),
});
export type CapacityAnalysisInput = z.infer<typeof CapacityAnalysisInputSchema>;


const CapacityAnalysisOutputSchema = z.object({
  totalRequiredHours: z.number().describe("The AI's total estimated hours required to complete all of today's scheduled services."),
  totalAvailableHours: z.number().describe("The total number of standard workable hours available from all active technicians."),
  capacityPercentage: z.number().describe("The calculated capacity percentage (totalRequiredHours / totalAvailableHours). Can be over 100."),
  recommendation: z.string().describe("A brief, actionable recommendation based on the capacity. E.g., 'Capacidad óptima', 'Taller al límite', 'Se pueden aceptar más trabajos'."),
});
export type CapacityAnalysisOutput = z.infer<typeof CapacityAnalysisOutputSchema>;

// The input for the AI prompt itself, which receives pre-processed data
const ProcessedHistoryItemSchema = z.object({
  description: z.string(),
  durationInHours: z.number(),
});
const CapacityAnalysisPromptInputSchema = z.object({
  servicesForDay: z.array(ServiceForDaySchema),
  processedServiceHistory: z.array(ProcessedHistoryItemSchema),
});


const capacityAnalysisPrompt = ai.definePrompt({
  name: 'capacityAnalysisPrompt',
  input: { schema: CapacityAnalysisPromptInputSchema },
  output: { schema: z.object({ serviceDurations: z.array(z.object({ description: z.string(), estimatedHours: z.number() })) }) },
  prompt: `You are an expert workshop manager. Your task is to estimate the time required for a list of scheduled services based on a history of past work.

**Instructions:**
1.  **Analyze Historical Data:** Review the \`processedServiceHistory\`. This contains job descriptions and their actual durations in hours. Learn the typical duration for different types of job descriptions.
2.  **Estimate Durations for Today's Services:** For each service in the \`servicesForDay\` list, use the knowledge gained from the historical data to estimate its duration in hours.
3.  **Handle Unknowns:** If a service description is new or unclear, make a reasonable estimation based on keywords (e.g., 'revisión' might be 1-2 hours, 'cambio' 1-3 hours, 'diagnóstico' 2 hours, 'reparación' 4+ hours). A standard service is 1 hour.
4.  **Return Estimations:** Provide a list of each service description for the day along with its estimated duration in hours.

**Historical Data (for learning):**
{{#each processedServiceHistory}}
- Description: "{{description}}", Actual Duration: {{durationInHours}} hours
{{/each}}

**Services to Estimate for Today:**
{{#each servicesForDay}}
- "{{description}}"
{{/each}}
`,
});

const capacityAnalysisFlow = ai.defineFlow(
  {
    name: 'capacityAnalysisFlow',
    inputSchema: CapacityAnalysisInputSchema,
    outputSchema: CapacityAnalysisOutputSchema,
  },
  async (input) => {
    // Pre-process the service history to calculate durations in code for accuracy.
    const processedServiceHistory = input.serviceHistory
      .map(item => {
        if (!item.serviceDate || !item.deliveryDateTime) {
          return { description: item.description, durationInHours: 1 }; // Default to 1 hour if end time is missing
        }
        const startDate = parseISO(item.serviceDate);
        const endDate = parseISO(item.deliveryDateTime);
        if (!isValid(startDate) || !isValid(endDate)) {
          return null; // Ignore invalid date entries
        }
        const durationInMinutes = differenceInMinutes(endDate, startDate);
        // Only include reasonable durations to avoid skewing the data
        if (durationInMinutes <= 0 || durationInMinutes > 16 * 60) {
            return null;
        }
        return {
          description: item.description,
          durationInHours: Math.round((durationInMinutes / 60) * 10) / 10, // Round to one decimal place
        };
      })
      .filter((item): item is z.infer<typeof ProcessedHistoryItemSchema> => item !== null);
    
    // Now, call the AI with the clean, pre-processed data.
    const promptInput = {
      servicesForDay: input.servicesForDay,
      processedServiceHistory: processedServiceHistory,
    };
    
    const { output } = await capacityAnalysisPrompt(promptInput, {
      config: { temperature: 0.2 },
    });

    if (!output || !output.serviceDurations) {
      throw new Error("AI failed to provide estimated durations.");
    }
    
    const totalRequiredHours = output.serviceDurations.reduce((sum, s) => sum + s.estimatedHours, 0);
    const totalAvailableHours = input.technicians.reduce((sum, t) => sum + t.standardHoursPerDay, 0);
    const capacityPercentage = totalAvailableHours > 0 ? (totalRequiredHours / totalAvailableHours) * 100 : 0;
    
    let recommendation = "Capacidad desconocida";
    if (capacityPercentage < 75) {
        recommendation = "Se pueden aceptar más trabajos";
    } else if (capacityPercentage <= 95) {
        recommendation = "Capacidad óptima";
    } else if (capacityPercentage <= 110) {
        recommendation = "Taller al límite";
    } else {
        recommendation = "Taller sobrecargado. Se requieren horas extra.";
    }

    return {
      totalRequiredHours,
      totalAvailableHours,
      capacityPercentage: Math.round(capacityPercentage),
      recommendation,
    };
  }
);


/**
 * The main exported function that the UI calls.
 * This function orchestrates the pre-processing, AI call, and post-processing.
 * @param input The raw data from the application.
 * @returns A promise that resolves to the capacity analysis output.
 */
export async function analyzeWorkshopCapacity(input: CapacityAnalysisInput): Promise<CapacityAnalysisOutput> {
  return capacityAnalysisFlow(input);
}
