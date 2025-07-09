"use client";

import type { RentalPayment } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';

interface RentalReceiptContentProps {
  payment: RentalPayment;
}

export const RentalReceiptContent = React.forwardRef<HTMLDivElement, RentalReceiptContentProps>(
  ({ payment }, ref) => {
    const workshopInfo = {
      name: "RANORO",
      phone: "4491425323",
      addressLine1: "Av. de la Convencion de 1914 No. 1421",
    };

    const formattedDateTime = format(parseISO(payment.paymentDate), "dd/MM/yyyy HH:mm:ss", { locale: es });
    const formattedAmount = `$${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div 
        ref={ref}
        data-format="receipt"
        className="font-mono bg-white text-black px-2 py-4 max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0"
      >
        <div className="text-center mb-2">
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
        
        <div className="border-t border-dashed border-neutral-400 mt-1 mb-2"></div>

        <div className="text-center font-bold my-2">RECIBO DE PAGO DE RENTA</div>

        <div className="space-y-1">
            <div className="flex justify-between"><span>Conductor:</span><span className="font-semibold">{payment.driverName}</span></div>
            <div className="flex justify-between"><span>Vehículo:</span><span className="font-semibold">{payment.vehicleLicensePlate}</span></div>
            <div className="flex justify-between text-lg"><span>TOTAL PAGADO:</span><span className="font-bold">{formattedAmount}</span></div>
        </div>
        
        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <p className="text-center mt-4">¡Gracias por su pago!</p>
      </div>
    );
  }
);

RentalReceiptContent.displayName = "RentalReceiptContent";
