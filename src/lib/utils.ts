
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Car, Clock, CheckCircle, XCircle, Wrench, Package, AlertCircle } from 'lucide-react';
import type { PaymentMethod, ServiceSubStatus, Driver, RentalPayment, Vehicle, ManualDebtEntry } from '@/types';
import { parseISO, isAfter, startOfDay, differenceInCalendarDays, format as formatFns } from 'date-fns';
import { es } from 'date-fns/locale';
export { toNumber, formatMXN as formatCurrency, IVA_RATE } from './money';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDataUrl(dataUrl: string): string {
  if (!dataUrl) return '';
  if (dataUrl.startsWith('data:') || dataUrl.startsWith('http')) {
    return dataUrl;
  }
  return `data:image/png;base64,${dataUrl}`;
}


export const calculateDriverDebt = (
    driver: Driver, 
    allPayments: RentalPayment[], 
    allVehicles: Vehicle[], 
    manualDebts: ManualDebtEntry[]
): { totalDebt: number; rentalDebt: number; depositDebt: number; manualDebt: number, balance: number } => {
    const vehicle = allVehicles.find(v => v.id === driver.assignedVehicleId);
    
    if (!driver || !vehicle?.dailyRentalCost) {
      return { totalDebt: 0, rentalDebt: 0, depositDebt: 0, manualDebt: 0, balance: 0 };
    }

    const today = startOfDay(new Date());
    const contractStartDate = driver.contractDate ? parseISO(driver.contractDate) : today;
    
    let totalRentalCharges = 0;
    if (isAfter(today, contractStartDate) || today.getTime() === contractStartDate.getTime()) {
        const daysSinceStart = differenceInCalendarDays(today, contractStartDate) + 1;
        totalRentalCharges = daysSinceStart * vehicle.dailyRentalCost;
    }

    const totalPayments = (allPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const manualDebtTotal = (manualDebts || []).reduce((sum, debt) => sum + debt.amount, 0);
    const depositDebt = Math.max(0, (driver.requiredDepositAmount || 0) - (driver.depositAmount || 0));

    const balance = totalPayments - (totalRentalCharges + manualDebtTotal);
    
    const totalDebt = (totalRentalCharges + manualDebtTotal + depositDebt) - totalPayments;

    return { 
        totalDebt: Math.max(0, totalDebt),
        rentalDebt: Math.max(0, totalRentalCharges),
        depositDebt: depositDebt, 
        manualDebt: manualDebtTotal,
        balance: balance
    };
};


export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};


export function getStatusInfo(status: string, subStatus?: ServiceSubStatus) {
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
                case 'Ingresado':
                    return { color: 'destructive', icon: Car, label: 'Ingresado' };
                case 'En Espera de Refacciones':
                    return { color: 'waiting', icon: Package, label: 'Espera Refacciones' };
                case 'Reparando':
                    return { color: 'blue', icon: Wrench, label: 'Reparando' };
                case 'Completado':
                     return { color: 'success', icon: CheckCircle, label: 'Listo para Entrega' };
                default:
                    return { color: 'blue', icon: Wrench, label: 'En Taller' };
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
      const img = new Image();
      img.src = file;
    }
  });
};


export function capitalizeSentences(str: string): string {
    if (!str) return "";
    return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
}

export function getMonthName(monthNumber: number): string {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return formatFns(date, 'MMMM', { locale: es });
}
