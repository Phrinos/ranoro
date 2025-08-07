
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Car, Clock, CheckCircle, XCircle, Wrench, Package, AlertCircle } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) {
        return '$0.00';
    }
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
}

export function normalizeDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  return `data:image/png;base64,${dataUrl}`;
}


export const calculateDriverDebt = (driverId: string, allPayments: any[], allExpenses: any[]): number => {
    const totalPayments = allPayments
        .filter(p => p.driverId === driverId)
        .reduce((sum, p) => sum + p.amount, 0);

    const totalExpenses = allExpenses
        .filter(e => e.driverId === driverId)
        .reduce((sum, e) => sum + e.amount, 0);

    return totalPayments - totalExpenses;
};

export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};


export function getStatusInfo(status: string, subStatus?: string, appointmentStatus?: string) {
    switch (status) {
        case 'Agendado':
            if (appointmentStatus === 'Confirmada') {
                return { color: 'blue-500', icon: Clock, label: 'Cita Confirmada' };
            }
            return { color: 'blue-400', icon: Clock, label: 'Agendado' };
        case 'En Taller':
            switch (subStatus) {
                case 'En Espera de Refacciones':
                    return { color: 'yellow-500', icon: Package, label: 'Esperando Refacciones' };
                case 'Reparando':
                    return { color: 'orange-500', icon: Wrench, label: 'Reparando' };
                case 'Completado':
                     return { color: 'green-500', icon: CheckCircle, label: 'Listo para Entrega' };
                default:
                    return { color: 'orange-400', icon: Wrench, label: 'En Taller' };
            }
        case 'Entregado':
            return { color: 'green-600', icon: CheckCircle, label: 'Entregado' };
        case 'Cancelado':
            return { color: 'red-500', icon: XCircle, label: 'Cancelado' };
        case 'Cotizacion':
            return { color: 'gray-500', icon: AlertCircle, label: 'Cotización' };
        default:
            return { color: 'gray-400', icon: AlertCircle, label: 'Desconocido' };
    }
}

export const optimizeImage = (file: File, maxWidthOrHeight: number, quality = 0.9): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
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
    reader.readAsDataURL(file);
  });
};
