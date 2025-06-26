'use server';
/**
 * @fileOverview An AI flow to enhance text by correcting spelling and grammar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const EnhanceTextInputSchema = z.object({
  text: z.string().describe("The text to be enhanced."),
});

const EnhanceTextOutputSchema = z.string().describe("The corrected and improved text.");

export async function enhanceText(text: string): Promise<string> {
  return enhanceTextFlow({ text });
}

const enhanceTextPrompt = ai.definePrompt({
  name: 'enhanceTextPrompt',
  input: { schema: EnhanceTextInputSchema },
  output: { schema: EnhanceTextOutputSchema },
  prompt: `You are a helpful assistant for an auto repair shop. Correct any spelling mistakes, fix grammar, and improve the clarity and professionalism of the following text. Return only the corrected text, without any preamble or explanation.

Original Text:
"{{{text}}}"
`,
});

const enhanceTextFlow = ai.defineFlow(
  {
    name: 'enhanceTextFlow',
    inputSchema: EnhanceTextInputSchema,
    outputSchema: EnhanceTextOutputSchema,
  },
  async (input) => {
    if (!input.text || input.text.trim().length < 2) {
      return input.text || ''; // Don't process empty or very short strings, return original
    }
    const { output } = await enhanceTextPrompt(input, {
      config: { temperature: 0.2 },
    });
    return output || input.text; // Return original text if AI fails
  }
);
