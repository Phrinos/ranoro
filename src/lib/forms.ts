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
 * Recursively prepares an object for Firestore. It converts Date objects to ISO strings
 * and removes properties with `undefined` values, replacing them with `null`.
 * @param obj The object or array to clean.
 * @returns A new object or array ready for Firestore.
 */
export const cleanObjectForFirestore = (obj: any): any => {
  if (obj === undefined) {
    return null; // Top-level undefined becomes null
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects explicitly and convert to ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObjectForFirestore).filter(v => v !== undefined); // Filter out undefined from arrays
  }
  
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = cleanObjectForFirestore(value);
    } else {
      acc[key] = null; // Explicitly set undefined properties to null
    }
    return acc;
  }, {} as any);
};
