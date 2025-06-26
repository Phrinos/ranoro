
'use server';
/**
 * @fileOverview An AI flow to enhance text by correcting spelling and grammar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// This is the schema for the prompt itself, which requires a non-empty string.
const PromptInputSchema = z.string().min(1);

// This is the schema for the flow, which can accept null or undefined text.
const FlowInputSchema = z.string().nullable().optional();
const FlowOutputSchema = z.string();


export async function enhanceText(text: string | null | undefined): Promise<string> {
  return enhanceTextFlow(text);
}

const enhanceTextPrompt = ai.definePrompt({
  name: 'enhanceTextPrompt',
  input: { schema: PromptInputSchema }, // Prompt strictly requires a string
  output: { schema: FlowOutputSchema },
  prompt: `You are a helpful assistant for an auto repair shop. Correct any spelling mistakes, fix grammar, and improve the clarity and professionalism of the following text. Return only the corrected text, without any preamble or explanation.

Original Text:
"{{{this}}}"
`,
});

const enhanceTextFlow = ai.defineFlow(
  {
    name: 'enhanceTextFlow',
    inputSchema: FlowInputSchema, // Flow now accepts nullable string
    outputSchema: FlowOutputSchema,
  },
  async (text) => {
    // Check for null, undefined, or short/empty strings inside the flow.
    if (!text || text.trim().length < 2) {
      return text || ''; // Return empty string if input is null/undefined/empty.
    }
    
    // Only call the prompt if the text is valid.
    const { output } = await enhanceTextPrompt(text, {
      config: { temperature: 0.2 },
    });
    
    return output || text; // Return original text if AI fails
  }
);
