

"use client";

import type { RentalPayment, WorkshopInfo, Driver } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import Image from "next/image";
import { placeholderDrivers, placeholderVehicles, placeholderRentalPayments } from '@/lib/placeholder-data';
import { calculateDriverDebt, formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};


interface RentalReceiptContentProps {
  payment: RentalPayment;
  workshopInfo?: Partial<WorkshopInfo>;
}

export const RentalReceiptContent = React.forwardRef<HTMLDivElement, RentalReceiptContentProps>(
  ({ payment, workshopInfo: customWorkshopInfo }, ref) => {
    const workshopInfo = { ...initialWorkshopInfo, ...customWorkshopInfo };

    const formattedDateTime = format(parseISO(payment.paymentDate), "dd/MM/yyyy HH:mm:ss", { locale: es });
    const formattedAmount = `$${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const driver = useMemo(() => placeholderDrivers.find(d => d.id === payment.driverId), [payment.driverId]);

    const driverDebt = useMemo(() => {
        if (!driver) return { totalDebt: 0, rentalDebt: 0, depositDebt: 0, manualDebt: 0 };
        // We pass ALL payments and vehicles to get the most accurate, up-to-date debt calculation
        return calculateDriverDebt(driver, placeholderRentalPayments, placeholderVehicles);
    }, [driver]);

    return (
      <div 
        ref={ref}
        data-format="receipt"
        className="font-mono bg-white text-black px-2 py-4 max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0"
      >
        <div className="text-center mb-2">
           {workshopInfo.logoUrl && (
            <div className="mx-auto mb-1 relative" style={{ width: `${workshopInfo.logoWidth || 120}px`, height: `${(workshopInfo.logoWidth || 120) / 3}px`}}>
                <Image 
                    src={workshopInfo.logoUrl} 
                    alt="Logo" 
                    fill
                    style={{ objectFit: 'contain' }}
                    crossOrigin="anonymous"
                    data-ai-hint="workshop logo"
                />
            </div>
          )}
          <h1 className="text-lg font-bold">{workshopInfo.name}</h1>
          <p>{workshopInfo.addressLine1}</p>
          <p>Tel: {workshopInfo.phone}</p>
        </div>

        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{formattedDateTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Folio:</span>
          <span>{payment.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Asesor:</span>
          <span>{payment.registeredBy}</span>
        </div>
        
        <div className="border-t border-dashed border-neutral-400 mt-1 mb-2"></div>

        <div className="text-center font-bold my-2">RECIBO DE PAGO DE RENTA</div>

        <div className="space-y-1">
            <div className="flex justify-between"><span>Conductor:</span><span className="font-semibold">{payment.driverName}</span></div>
            <div className="flex justify-between"><span>Vehículo:</span><span className="font-semibold">{payment.vehicleLicensePlate}</span></div>
            {payment.note && <div className="text-left"><span>Concepto:</span><span className="font-semibold block">{payment.note}</span></div>}
            <div className="flex justify-between text-lg"><span>TOTAL PAGADO:</span><span className="font-bold">{formattedAmount}</span></div>
        </div>
        
        {driverDebt.totalDebt > 0 && (
            <>
                <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>
                <div className="my-2 p-2 border border-red-500 bg-red-50 text-red-800">
                    <h4 className="font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>AVISO DE ADEUDO</h4>
                    <div className="space-y-0.5 text-xs mt-1">
                        {driverDebt.depositDebt > 0 && <div className="flex justify-between"><span>Deuda de depósito:</span><span>{formatCurrency(driverDebt.depositDebt)}</span></div>}
                        {driverDebt.rentalDebt > 0 && <div className="flex justify-between"><span>Deuda de renta (mensual):</span><span>{formatCurrency(driverDebt.rentalDebt)}</span></div>}
                        {driverDebt.manualDebt > 0 && <div className="flex justify-between"><span>Adeudo Pendiente:</span><span>{formatCurrency(driverDebt.manualDebt)}</span></div>}
                        <div className="flex justify-between font-bold border-t border-red-300 mt-1 pt-1"><span>Deuda Total Restante:</span><span>{formatCurrency(driverDebt.totalDebt)}</span></div>
                    </div>
                </div>
            </>
        )}

        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <p className="text-center mt-4">¡Gracias por su pago!</p>
      </div>
    );
  }
);

RentalReceiptContent.displayName = "RentalReceiptContent";
