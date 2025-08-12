
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Car, Clock, CheckCircle, XCircle, Wrench, Package, AlertCircle } from 'lucide-react';
import type { PaymentMethod, AgendadoSubStatus } from '@/types';
export { toNumber, formatMXN as formatCurrency, IVA_RATE } from './money';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  return `data:image/png;base64,${dataUrl}`;
}


export const calculateDriverDebt = (driver: any, allPayments: any[], allVehicles: any[]): { totalDebt: number; rentalDebt: number; depositDebt: number; manualDebt: number } => {
    // This is a placeholder function. The actual logic might be more complex.
    const rentalDebt = 0; // Placeholder
    const depositDebt = (driver.requiredDepositAmount || 0) - (driver.depositAmount || 0);
    const manualDebt = (driver.manualDebts || []).reduce((sum: number, debt: any) => sum + debt.amount, 0);

    return { 
        totalDebt: rentalDebt + depositDebt + manualDebt, 
        rentalDebt, 
        depositDebt, 
        manualDebt 
    };
};

export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};


export function getStatusInfo(status: string, subStatus?: string) {
    switch (status) {
        case 'Agendado':
            if (subStatus === 'Confirmada') {
                return { color: 'teal', icon: CheckCircle, label: 'Cita Confirmada' };
            }
            if (subStatus === 'Cancelada') {
                return { color: 'destructive', icon: XCircle, label: 'Cita Cancelada' };
            }
            return { color: 'blue', icon: Clock, label: 'Agendado' };
        case 'En Taller':
            switch (subStatus) {
                case 'En Espera de Refacciones':
                    return { color: 'waiting', icon: Package, label: 'Esperando Refacciones' };
                case 'Reparando':
                    return { color: 'purple', icon: Wrench, label: 'Reparando' };
                case 'Completado':
                     return { color: 'success', icon: CheckCircle, label: 'Listo para Entrega' };
                default:
                    return { color: 'purple', icon: Wrench, label: 'En Taller' };
            }
        case 'Entregado':
            return { color: 'success', icon: CheckCircle, label: 'Entregado' };
        case 'Cancelado':
            return { color: 'destructive', icon: XCircle, label: 'Cancelado' };
        case 'Cotizacion':
            return { color: 'outline', icon: AlertCircle, label: 'Cotización' };
        default:
            return { color: 'secondary', icon: AlertCircle, label: 'Desconocido' };
    }
}

export function getPaymentMethodVariant(method?: PaymentMethod): 'success' | 'purple' | 'lightPurple' {
    if (!method) return 'success';
    switch(method) {
        case 'Efectivo': return 'success';
        case 'Tarjeta': return 'purple';
        case 'Tarjeta MSI': return 'purple';
        case 'Transferencia': return 'lightPurple';
        default: return 'success';
    }
}

export function formatNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) {
    return '';
  }
  return num.toLocaleString('es-MX', options);
}


export const optimizeImage = (file: File | string, maxWidthOrHeight: number, quality = 0.9): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isFile = file instanceof File;

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round(height * (maxWidthOrHeight / width));
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round(width * (maxWidthOrHeight / height));
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas context.'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('Failed to read file.'));
      }
    };
    reader.onerror = (error) => reject(error);
    
    if (isFile) {
      reader.readAsDataURL(file);
    } else {
      // It's already a data URL string
      img.src = file;
    }
  });
};
