

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInCalendarDays, startOfToday, parseISO, isAfter, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { Driver, RentalPayment, Vehicle, PaymentMethod } from '@/types';

const STANDARD_DEPOSIT_AMOUNT = 3500;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number | undefined | null) => {
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
 * @param format The desired output format.
 * @returns A promise that resolves with the data URL of the optimized image.
 */
export const optimizeImage = (fileOrDataUrl: File | string, maxWidth: number, quality: number = 0.8, format: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const processImage = (dataUrl: string) => {
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
        if (!ctx) return reject(new Error('Could not get canvas context'));
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const outputDataUrl = canvas.toDataURL(format, quality);
        resolve(outputDataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    };

    if (typeof fileOrDataUrl === 'string') {
      processImage(fileOrDataUrl);
    } else { // It's a File object
      if (!fileOrDataUrl.type.startsWith('image/')) {
        return reject(new Error('El archivo no es una imagen.'));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) return reject(new Error('FileReader event target result is null.'));
        processImage(event.target.result as string);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
};

/**
 * Normalizes a base64 string or data URL to ensure it has the correct data URL prefix.
 * Also handles Firebase Storage URLs.
 * @param raw The raw signature string, which might be a full data URL, base64 data, or a Firebase URL.
 * @returns A valid URL string, or an empty string if the input is empty.
 */
export function normalizeDataUrl(raw?: string | null): string {
    if (!raw) return '';
    // If it's a Firebase Storage URL, return it directly.
    if (raw.startsWith('https://firebasestorage.googleapis.com')) {
      return raw;
    }
    // If it's already a valid data URL, return it.
    if (raw.startsWith('data:image/')) { // Check for any image type
      return raw;
    }
    // Otherwise, assume it's a raw base64 string and prepend the PNG header.
    // This is a common case for signatures saved before the fix.
    return `data:image/png;base64,${raw}`;
}

    
/**
 * Calculates the total debt for a given driver, including rental arrears, deposit, and manual debts.
 * The rental debt is calculated based on the current month's activity.
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

    // 3. Calculate Rental Debt for the CURRENT MONTH ONLY
    let rentalDebt = 0;
    const assignedVehicle = allVehicles.find(v => v.id === driver.assignedVehicleId);
    
    if (driver.contractDate && assignedVehicle?.dailyRentalCost) {
        const today = new Date();
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        
        const contractStartDate = parseISO(driver.contractDate);

        // Determine the start date for calculation within the current month
        const calculationStartDate = isAfter(contractStartDate, monthStart) ? contractStartDate : monthStart;

        if (!isAfter(calculationStartDate, today)) {
            const daysToChargeThisMonth = differenceInCalendarDays(today, calculationStartDate) + 1;
            const expectedRentalThisMonth = daysToChargeThisMonth * assignedVehicle.dailyRentalCost;
            
            const paymentsThisMonth = allPayments
                .filter(p => 
                    p.driverId === driver.id && 
                    isWithinInterval(parseISO(p.paymentDate), { start: monthStart, end: monthEnd })
                )
                .reduce((sum, p) => sum + p.amount, 0);

            rentalDebt = Math.max(0, expectedRentalThisMonth - paymentsThisMonth);
        }
    }

    const totalDebt = depositDebt + manualDebt + rentalDebt;

    return { totalDebt, rentalDebt, depositDebt, manualDebt };
}

export const getPaymentMethodVariant = (method?: PaymentMethod): 'success' | 'purple' | 'blue' | 'lightGreen' | 'lightPurple' | 'outline' | 'teal' => {
  switch (method) {
    case 'Efectivo': return 'success';
    case 'Tarjeta': return 'purple';
    case 'Efectivo/Tarjeta': return 'teal';
    case 'Transferencia': return 'blue';
    case 'Efectivo+Transferencia': return 'lightGreen';
    case 'Tarjeta+Transferencia': return 'lightPurple';
    default: return 'outline';
  }
};
