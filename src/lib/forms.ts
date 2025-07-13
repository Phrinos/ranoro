// src/lib/forms.ts

import { parseISO, isValid } from 'date-fns';

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
      if (isValid(parsed)) {
          return parsed;
      }
      // Fallback for non-ISO date strings, though not recommended.
      const directParsed = new Date(d);
      if (isValid(directParsed)) {
          return directParsed;
      }
  }
  return null;
};

/**
 * Recursively prepares a plain JavaScript object for Firestore.
 * - Converts Date objects to ISO strings.
 * - Removes any keys where the value is `undefined`.
 * - Converts any values that are an empty string `''` to `null`.
 * @param obj The object or array to clean.
 * @returns A new object or array ready for Firestore.
 */
export const cleanObjectForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    // Return primitives directly (string, number, boolean, null)
    if (obj === '') return null; // Convert empty strings to null
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle Arrays: process each item and filter out any resulting undefined values
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanObjectForFirestore(item))
      .filter(item => item !== undefined);
  }

  // Handle Objects
  const cleanedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // Skip undefined values entirely
      if (value === undefined) {
        continue;
      }
      
      cleanedObj[key] = cleanObjectForFirestore(value);
    }
  }
  return cleanedObj;
};
