// src/lib/forms.ts

import { parseISO } from 'date-fns';

export const IVA_RATE = 0.16;

/**
 * Parses a date value that could be a Date object, an ISO string, a Firestore Timestamp, or a number (milliseconds).
 * @param d The date value to parse.
 * @returns A Date object or null if invalid.
 */
export const parseDate = (d: any): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d.toDate === 'function') return d.toDate(); // Firestore Timestamp
  if (typeof d === 'number') return new Date(d); // Milliseconds timestamp
  if (typeof d === 'string') {
      const parsed = parseISO(d);
      if (!isNaN(parsed.getTime())) {
          return parsed;
      }
      // Fallback for non-ISO date strings, though not recommended.
      const directParsed = new Date(d);
      if (!isNaN(directParsed.getTime())) {
          return directParsed;
      }
  }
  return null;
};

/**
 * Recursively removes properties with `undefined` values from an object or array.
 * This is useful for preparing data for Firestore, which doesn't accept `undefined`.
 * @param obj The object or array to clean.
 * @returns A new object or array with `undefined` values removed.
 */
export const cleanObjectForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectForFirestore);
  }
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = cleanObjectForFirestore(value);
    }
    return acc;
  }, {} as any);
};
