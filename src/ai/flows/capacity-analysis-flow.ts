
'use server';
/**
 * @fileOverview AI flow to analyze the daily capacity of the workshop.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { differenceInMinutes, parseISO, isValid } from 'date-fns';

// -------- Schemas --------
const ServiceForDaySchema = z.object({
  description: z.string().describe("The description of a service scheduled for today."),
});

const TechnicianInputSchema = z.object({
  id: z.string(),
  standardHoursPerDay: z.number().default(8).describe("The standard number of workable hours for this technician in a day."),
});

const ServiceHistoryItemSchema = z.object({
  description: z.string().describe("The description of a past service."),
  serviceDate: z.string().optional(),
  deliveryDateTime: z.string().optional(),
});

const CapacityAnalysisInputSchema = z.object({
  servicesForDay: z.array(ServiceForDaySchema),
  technicians: z.array(TechnicianInputSchema),
  serviceHistory: z.array(ServiceHistoryItemSchema),
});
export type CapacityAnalysisInput = z.infer<typeof CapacityAnalysisInputSchema>;

const CapacityAnalysisOutputSchema = z.object({
  totalRequiredHours: z.number(),
  totalAvailableHours: z.number(),
  capacityPercentage: z.number(),
  recommendation: z.string(),
});
export type CapacityAnalysisOutput = z.infer<typeof CapacityAnalysisOutputSchema>;

const ProcessedHistoryItemSchema = z.object({
  description: z.string(),
  durationInHours: z.number(),
});
const CapacityAnalysisPromptInputSchema = z.object({
  servicesForDay: z.array(ServiceForDaySchema),
  processedServiceHistory: z.array(ProcessedHistoryItemSchema),
});

// -------- Prompt --------
const capacityAnalysisPrompt = ai.definePrompt({
  name: 'capacityAnalysisPrompt',
  system:
    'You are an expert workshop manager. Estimate hours for today’s services, learning from historical jobs.',
  input: { schema: CapacityAnalysisPromptInputSchema },
  output: {
    schema: z.object({
      serviceDurations: z.array(
        z.object({
          description: z.string(),
          estimatedHours: z.number().nonnegative().finite(),
        })
      ),
    }),
  },
  prompt: `
Return ONLY a JSON object with this exact shape:
{"serviceDurations":[{"description":string,"estimatedHours":number}, ...]}

Rules:
- Learn typical durations from "processedServiceHistory".
- If no close match exists, infer by keywords:
  - "revisión": 1-2h (1.5 if unsure)
  - "cambio": 1-3h (2 if unsure)
  - "diagnóstico": ~2h
  - "reparación": 4-6h (5 if unsure)
  - default: 1h
- No extra keys or prose.

Historical Data:
{{#each processedServiceHistory}}
{"description":"{{description}}","durationInHours":{{durationInHours}}}
{{/each}}

Today’s Services:
{{#each servicesForDay}}
"{{description}}"
{{/each}}
`,
});

// -------- Flow --------
const capacityAnalysisFlow = ai.defineFlow(
  {
    name: 'capacityAnalysisFlow',
    inputSchema: CapacityAnalysisInputSchema,
    outputSchema: CapacityAnalysisOutputSchema,
  },
  async (input) => {
    // 1) Pre-process history
    const processedServiceHistory = input.serviceHistory
      .map((item) => {
        if (!item.serviceDate || !item.deliveryDateTime) return null;
        const startDate = parseISO(item.serviceDate);
        const endDate = parseISO(item.deliveryDateTime);
        if (!isValid(startDate) || !isValid(endDate)) return null;

        const minutes = differenceInMinutes(endDate, startDate);
        if (minutes <= 0 || minutes > 16 * 60) return null; // evitar outliers

        return {
          description: item.description,
          durationInHours: Math.round((minutes / 60) * 10) / 10,
        };
      })
      .filter((x): x is z.infer<typeof ProcessedHistoryItemSchema> => x !== null);

    // 2) Llamada IA con logs claros
    const promptInput = { servicesForDay: input.servicesForDay, processedServiceHistory };

    let serviceDurations:
      | { description: string; estimatedHours: number }[]
      | undefined;

    try {
      const result = await capacityAnalysisPrompt(promptInput, {
        config: { temperature: 0.2 },
      });

      // Si Genkit valida el schema, esto ya debería venir limpio
      serviceDurations = result.output?.serviceDurations;
    } catch (e: any) {
      // Logs útiles en dev
      if (process.env.NODE_ENV !== 'production') {
        console.error('[capacityAnalysisPrompt] Error:', e?.message || e);
        // Algunos motores adjuntan info de validación:
        if (e?.issues) console.error('[Zod issues]:', e.issues);
        if (e?.cause) console.error('[Cause]:', e.cause);
      }
    }

    // 3) Fallback heurístico si la IA falló
    if (!serviceDurations || !Array.isArray(serviceDurations)) {
      const guess = (d: string): number => {
        const s = d.toLowerCase();
        if (s.includes('revisión')) return 1.5;
        if (s.includes('diagnóstico')) return 2;
        if (s.includes('cambio')) return 2;
        if (s.includes('reparación')) return 5;
        return 1;
      };
      serviceDurations = input.servicesForDay.map((s) => ({
        description: s.description,
        estimatedHours: guess(s.description),
      }));
    }

    // 4) Post-proceso
    const totalRequiredHours = serviceDurations.reduce((sum, s) => sum + (Number.isFinite(s.estimatedHours) ? s.estimatedHours : 0), 0);
    const totalAvailableHours = input.technicians.reduce((sum, t) => sum + (t.standardHoursPerDay || 0), 0);
    const capacityPct = totalAvailableHours > 0 ? (totalRequiredHours / totalAvailableHours) * 100 : 0;

    let recommendation = 'Capacidad desconocida';
    if (capacityPct < 75) recommendation = 'Se pueden aceptar más trabajos';
    else if (capacityPct <= 95) recommendation = 'Capacidad óptima';
    else if (capacityPct <= 110) recommendation = 'Taller al límite';
    else recommendation = 'Taller sobrecargado. Se requieren horas extra.';

    return {
      totalRequiredHours: Math.round(totalRequiredHours * 10) / 10,
      totalAvailableHours,
      capacityPercentage: Math.round(capacityPct),
      recommendation,
    };
  }
);

// -------- Public API --------
export async function analyzeWorkshopCapacity(
  input: CapacityAnalysisInput
): Promise<CapacityAnalysisOutput> {
  try {
    return await capacityAnalysisFlow(input);
  } catch (error: any) {
    // En dev, devuelve más detalle para diagnóstico
    const msg =
      process.env.NODE_ENV !== 'production'
        ? `IA error: ${error?.message || error}`
        : 'Ocurrió un error al consultar la IA. Por favor, intente de nuevo más tarde.';
    console.error('AI Error en análisis de capacidad:', error);
    throw new Error(msg);
  }
}
