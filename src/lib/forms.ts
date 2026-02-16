// src/lib/forms.ts

import { parseISO, isValid } from 'date-fns';

/**
 * Parses a date value that could be a Date object, an ISO string, a Firestore Timestamp, or a number (milliseconds).
 * Handles Firestore Timestamps both on the client (with toDate method) and when serialized (with seconds/nanoseconds properties).
 * @param d The date value to parse.
 * @returns A Date object or null if invalid.
 */
export function parseDate(value: any): Date | null {
  if (!value) return null;

  // Date
  if (value instanceof Date) return isValid(value) ? value : null;

  // Firestore Timestamp (v9) { toDate() }
  if (typeof value === "object" && typeof value.toDate === "function") {
    const d = value.toDate();
    return isValid(d) ? d : null;
  }

  // Firestore-like { seconds, nanoseconds }
  if (typeof value === "object" && (value.seconds !== undefined || value._seconds !== undefined)) {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
    const d = new Date(seconds * 1000 + nanoseconds / 1000000);
    return isValid(d) ? d : null;
  }

  // number (ms)
  if (typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }

  // string
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // ISO (2026-02-16T...Z)
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) || s.endsWith("Z")) {
      const d = parseISO(s);
      return isValid(d) ? d : null;
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T00:00:00`);
      return isValid(d) ? d : null;
    }

    // fallback (si guardas fechas “legibles”)
    const d = new Date(s);
    return isValid(d) ? d : null;
  }

  return null;
}


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
      return null; // Convert undefined to null for Firestore compatibility.
    }
  
    if (obj === null || typeof obj !== 'object') {
      return obj; // Primitives are returned as-is.
    }
  
    if (obj instanceof Date) {
      return obj.toISOString();
    }
  
    if (Array.isArray(obj)) {
      // If it's an array, recursively clean each item.
      return obj.map(item => cleanObjectForFirestore(item));
    }
  
    // List of keys that should be strings and not null.
    // This now works on any level of nesting.
    const stringFields = [
      'notes', 'vehicleConditions', 'customerItems', 'cancellationReason', 
      'description', 'serviceType', 'subStatus', 'name', 'supplyName'
    ];
  
    // If it's an object, process its properties recursively.
    const cleanedObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        let value = cleanObjectForFirestore(obj[key]);
  
        // If the value is null but the key is one of our designated string fields,
        // convert null to an empty string.
        if (value === null && stringFields.includes(key)) {
          value = '';
        }
        cleanedObj[key] = value;
      }
    }
    return cleanedObj;
  };
