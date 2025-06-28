
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


/**
 * Resizes and compresses an image file before upload.
 * @param file The image file to process.
 * @param maxWidth The maximum width of the output image.
 * @param quality The quality of the output JPEG image (0 to 1).
 * @returns A promise that resolves with the data URL of the optimized image.
 */
export const optimizeImage = (file: File, maxWidth: number, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
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
