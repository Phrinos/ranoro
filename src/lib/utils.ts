
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Capitalizes the first letter of each word in a string.
 * @param str The input string.
 * @returns The capitalized string.
 */
export const capitalizeWords = (str: string) => {
  if (!str) return '';
  // Convert the whole string to lowercase first, then capitalize each word.
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Capitalizes the first letter of the first word in a string.
 * @param str The input string.
 * @returns The capitalized string.
 */
export const capitalizeSentences = (str: string) => {
    if (!str) return '';
    let processedStr = str.trim();
    // Capitalize the very first letter of the whole string
    processedStr = processedStr.charAt(0).toUpperCase() + processedStr.slice(1);
    // Capitalize the letter after each period and one or more spaces
    processedStr = processedStr.replace(/(\.\s+)([a-z])/g, (_match, p1, p2) => p1 + p2.toUpperCase());
    return processedStr;
};
