// src/services/quote.service.ts

'use server';

import type { Vehicle, ServiceRecord, InventoryItem, QuoteSuggestionOutput } from '@/types';
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow';

export interface GenerateQuoteArgs {
  vehicle: Vehicle;
  serviceDescription: string;
  serviceHistory: ServiceRecord[];
  inventory: InventoryItem[];
}

/**
 * Handles the business logic for generating a quote using AI.
 * This function prepares the data and calls the Genkit flow.
 * @param args - The arguments required to generate the quote.
 * @returns The AI's suggested quote.
 */
export async function generateQuoteWithAI(args: GenerateQuoteArgs): Promise<QuoteSuggestionOutput> {
  const { vehicle, serviceDescription, serviceHistory, inventory } = args;

  // Prepare input for the AI flow
  const flowInput = {
    vehicleInfo: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    },
    serviceDescription: serviceDescription,
    serviceHistory: serviceHistory.map((s) => ({
      description: s.description ?? '',
      totalCost: s.totalCost ?? 0,
      suppliesUsed: (s.serviceItems ?? [])
        .flatMap((i) => i.suppliesUsed ?? [])
        .map((su) => ({
          supplyName: su.supplyName ?? '',
          quantity: su.quantity,
        })),
    })),
    inventory: inventory.map((i) => ({
      id: i.id,
      name: i.name,
      sellingPrice: i.sellingPrice,
    })),
  };

  try {
    const result = await suggestQuote(flowInput);
    return result;
  } catch (error) {
    console.error("Error generating quote with AI service:", error);
    // Re-throw a more user-friendly error or handle it as needed
    throw new Error("La IA no pudo generar la cotización. Por favor, inténtelo de nuevo.");
  }
}
