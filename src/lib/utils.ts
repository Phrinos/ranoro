

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInCalendarDays, startOfToday, parseISO, isAfter } from 'date-fns';
import type { Driver, RentalPayment, Vehicle } from '@/types';
import { STANDARD_DEPOSIT_AMOUNT } from '@/lib/placeholder-data';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Capitalizes the first letter of each word in a string.
 * This version converts the string to lowercase first to handle mixed-case and all-caps inputs consistently.
 * e.g., "servicio de motor" -> "Servicio De Motor", "IPHONE" -> "Iphone"
 * @param str The input string.
 * @returns The capitalized string.
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};


/**
 * Capitalizes the first letter of sentences in a string.
 * It ensures the first letter is always capitalized and normalizes all-caps text.
 * e.g., "hola mundo. esta es una prueba." -> "Hola mundo. Esta es una prueba."
 * e.g., "HOLA MUNDO." -> "Hola mundo."
 * @param str The input string.
 * @returns The capitalized string.
 */
export const capitalizeSentences = (str: string): string => {
    if (!str) return '';
    let processedStr = str; // Do not trim, to allow spaces between words
    if (!processedStr) return '';

    // First, convert the entire string to lowercase to handle the all-caps issue.
    processedStr = processedStr.toLowerCase();
    
    // Capitalize the very first letter of the whole string.
    processedStr = processedStr.charAt(0).toUpperCase() + processedStr.slice(1);
    
    // Capitalize the letter that follows a sentence-ending punctuation mark and whitespace.
    // The `g` flag ensures it replaces all occurrences.
    // The `u` flag helps with unicode characters.
    processedStr = processedStr.replace(/([.?!]\s+)(\p{L})/gu, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });

    return processedStr;
};


/**
 * Resizes and compresses an image file before upload.
 * @param file The image file to process.
 * @param maxWidth The maximum width of the output image.
 * @param quality The quality of the output JPEG image (0 to 1).
 * @returns A promise that resolves with the data URL of the optimized image.
 */
export const optimizeImage = (file: File, maxWidth: number, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        return reject(new Error('El archivo no es una imagen.'));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error('FileReader event target result is null.'));
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const scaleFactor = maxWidth / width;
          width = maxWidth;
          height = img.height * scaleFactor;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get the data URL of the resized image
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Normalizes a base64 string or data URL to ensure it has the correct data URL prefix.
 * @param raw The raw signature string, which might be a full data URL or just base64 data.
 * @returns A valid data URL string, or an empty string if the input is empty.
 */
export function normalizeDataUrl(raw?: string) {
  if (!raw) return "";
  // If it already starts with "data:", it's a valid data URL.
  if (raw.startsWith("data:")) return raw;
  // Otherwise, assume it's a raw base64 string and prepend the PNG header.
  return `data:image/png;base64,${raw}`;
}

/**
 * Recursively removes any keys with `undefined` values from an object or array.
 * This is crucial for Firestore, which does not allow `undefined` values.
 * @param obj The object or array to sanitize.
 * @returns A new object or array with `undefined` values removed.
 */
export function sanitizeObjectForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObjectForFirestore(item));
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = sanitizeObjectForFirestore(value);
      }
    }
  }
  return newObj;
}
    
/**
 * Calculates the total debt for a given driver.
 * This includes rental debt, deposit debt, and manual debts.
 * @param driver The driver object.
 * @param allPayments Array of all rental payments.
 * @param allVehicles Array of all vehicles to find the assigned one.
 * @returns An object with the total debt and its breakdown.
 */
export function calculateDriverDebt(driver: Driver, allPayments: RentalPayment[], allVehicles: Vehicle[]) {
    if (!driver) return { totalDebt: 0, rentalDebt: 0, depositDebt: 0, manualDebt: 0 };
    
    // 1. Calculate Deposit Debt
    const depositDebt = Math.max(0, STANDARD_DEPOSIT_AMOUNT - (driver.depositAmount || 0));
    
    // 2. Calculate Manual Debt
    const manualDebt = (driver.manualDebts || []).reduce((sum, debt) => sum + debt.amount, 0);

    // 3. Calculate Rental Debt
    let rentalDebt = 0;
    const assignedVehicle = allVehicles.find(v => v.id === driver.assignedVehicleId);
    if (driver.contractDate && assignedVehicle?.dailyRentalCost) {
        const contractStartDate = parseISO(driver.contractDate);
        const today = startOfToday();
        
        if (!isAfter(contractStartDate, today)) {
            const totalDaysSinceContract = differenceInCalendarDays(today, contractStartDate) + 1;
            const totalExpectedRental = totalDaysSinceContract * assignedVehicle.dailyRentalCost;
            
            const totalPaid = allPayments
                .filter(p => p.driverId === driver.id)
                .reduce((sum, p) => sum + p.amount, 0);

            rentalDebt = Math.max(0, totalExpectedRental - totalPaid);
        }
    }

    const totalDebt = depositDebt + manualDebt + rentalDebt;

    return { totalDebt, rentalDebt, depositDebt, manualDebt };
}
