
// src/lib/forms.ts

import { parseISO, isValid } from 'date-fns';

/**
 * Parses a date value that could be a Date object, an ISO string, a Firestore Timestamp, or a number (milliseconds).
 * Handles Firestore Timestamps both on the client (with toDate method) and when serialized (with seconds/nanoseconds properties).
 * @param d The date value to parse.
 * @returns A Date object or null if invalid.
 */
export const parseDate = (d: any): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return d;

  // Handle Firestore Timestamps
  // 1. Client-side SDK Timestamp object
  if (typeof d.toDate === 'function') {
    return d.toDate();
  }
  // 2. Serialized Timestamp object (from server-side rendering)
  if (typeof d === 'object' && d !== null && (d.seconds !== undefined || d._seconds !== undefined)) {
    const seconds = d.seconds ?? d._seconds;
    const nanoseconds = d.nanoseconds ?? d._nanoseconds ?? 0;
    const date = new Date(seconds * 1000 + nanoseconds / 1000000);
    if(isValid(date)) return date;
  }

  // Handle number (milliseconds timestamp)
  if (typeof d === 'number') {
    const date = new Date(d);
    if(isValid(date)) return date;
  }

  // Handle string formats
  if (typeof d === 'string') {
    // Standard ISO string
    let parsed = parseISO(d);
    if (isValid(parsed)) {
      return parsed;
    }
    // Fallback for other date-like strings
    parsed = new Date(d);
    if (isValid(parsed)) {
      return parsed;
    }
  }

  return null;
};


/**
 * Recursively cleans an object for Firestore.
 * - Converts `undefined` values to `null`.
 * - Converts `null` to `''` for specific string fields to avoid type errors.
 * - Converts Date objects to ISO strings.
 * This makes the object safe for Firestore.
 * @param obj The object or array to clean.
 * @returns A new object or array ready for Firestore.
 */
export const cleanObjectForFirestore = (obj: any): any => {
  if (obj === undefined) {
    return null; // Convert undefined to null for Firestore compatibility
  }
  if (obj === null || typeof obj !== 'object') {
    return obj; // Primitives are returned as-is (except null, which is handled contextually below)
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item));
  }

  // List of keys that should be strings and not null.
  const stringFields = ['notes', 'vehicleConditions', 'customerItems', 'cancellationReason', 'description', 'serviceType', 'subStatus'];

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
        let finalValue = cleanObjectForFirestore(value);
        // If the value is null but the key is one of our designated string fields, convert null to an empty string.
        if (finalValue === null && stringFields.includes(key)) {
            finalValue = '';
        }
        return [key, finalValue];
    })
  );
};
