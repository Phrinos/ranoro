

// src/lib/forms.ts

import { parseISO, isValid } from 'date-fns';

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
 * Recursively cleans an object for Firestore.
 * - Converts `undefined` values to `null`.
 * - Converts Date objects to ISO strings.
 * This makes the object safe for Firestore, which doesn't accept `undefined`.
 * @param obj The object or array to clean.
 * @returns A new object or array ready for Firestore.
 */
export const cleanObjectForFirestore = (obj: any): any => {
  if (obj === undefined) {
    return null; // Convert undefined to null for Firestore compatibility
  }
  if (obj === null || typeof obj !== 'object') {
    return obj; // Primitives are returned as-is
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item));
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, cleanObjectForFirestore(value)])
  );
};
