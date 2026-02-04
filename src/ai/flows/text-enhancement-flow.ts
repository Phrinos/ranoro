'use server';
/**
 * @fileOverview Flow eliminado. La mejora de texto ahora es una capacidad intrínseca del Chat Inteligente o se maneja localmente.
 */
export async function enhanceText(input: { text: string | null | undefined }) {
  return input.text || '';
}
