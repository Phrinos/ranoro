
'use server';
/**
 * @fileOverview An AI flow to analyze the daily capacity of the workshop.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ServiceHistoryItemSchema = z.object({
  description: z.string().describe("The description of a past service."),
  serviceDate: z.string().describe("The start date and time of the service in ISO format."),
  deliveryDateTime: z.string().optional().describe("The end date and time of the service in ISO format."),
});

const TechnicianInputSchema = z.object({
  id: z.string(),
  standardHoursPerDay: z.number().default(8).describe("The standard number of workable hours for this technician in a day."),
});

const ServiceForDaySchema = z.object({
  description: z.string().describe("The description of a service scheduled for today."),
});

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

export async function analyzeWorkshopCapacity(input: CapacityAnalysisInput): Promise<CapacityAnalysisOutput> {
  return capacityAnalysisFlow(input);
}

const capacityAnalysisPrompt = ai.definePrompt({
  name: 'capacityAnalysisPrompt',
  input: { schema: CapacityAnalysisInputSchema },
  output: { schema: z.object({ serviceDurations: z.array(z.object({ description: z.string(), estimatedHours: z.number() })) }) },
  prompt: `You are an expert workshop manager. Your task is to estimate the time required for a list of scheduled services based on a history of past work.

**Instructions:**
1.  **Analyze Historical Data:** Review the \`serviceHistory\`. For each past service, calculate the duration in hours between \`serviceDate\` and \`deliveryDateTime\`. Learn the typical duration for different types of job descriptions. For example, a "Cambio de aceite" might consistently take 1 hour, while a "reparación de motor" might take 8-16 hours. A service with no end time (\`deliveryDateTime\`) can be assumed to take 1 hour.
2.  **Estimate Durations for Today's Services:** For each service in the \`servicesForDay\` list, use the knowledge gained from the historical data to estimate its duration in hours.
3.  **Handle Unknowns:** If a service description is new or unclear, make a reasonable estimation based on keywords (e.g., 'revisión' might be 1-2 hours, 'cambio' 1-3 hours, 'diagnóstico' 2 hours, 'reparación' 4+ hours). A standard service is 1 hour.
4.  **Return Estimations:** Provide a list of each service description for the day along with its estimated duration in hours.

**Historical Data (for learning):**
{{#each serviceHistory}}
- Description: "{{description}}", Start: {{serviceDate}}, End: {{deliveryDateTime}}
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
    const { output } = await capacityAnalysisPrompt.generate({
        input,
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
