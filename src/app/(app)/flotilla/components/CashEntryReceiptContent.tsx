
"use client";

import type { CashDrawerTransaction, WorkshopInfo } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};

interface CashEntryReceiptContentProps {
  entry: CashDrawerTransaction;
  workshopInfo?: Partial<WorkshopInfo>;
}

export const CashEntryReceiptContent = React.forwardRef<HTMLDivElement, CashEntryReceiptContentProps>(
  ({ entry, workshopInfo: customWorkshopInfo }, ref) => {
    const workshopInfo = { ...initialWorkshopInfo, ...customWorkshopInfo };
    const formattedDateTime = format(parseISO(entry.date), "dd/MM/yyyy HH:mm:ss", { locale: es });
    const formattedAmount = formatCurrency(entry.amount);

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
                    unoptimized
                />
            </div>
          )}
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
          <span>{entry.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Registrado por:</span>
          <span>{entry.userName}</span>
        </div>
        
        <div className="border-t border-dashed border-neutral-400 mt-1 mb-2"></div>

        <div className="text-center font-bold my-2">COMPROBANTE DE INGRESO DE EFECTIVO</div>

        <div className="space-y-1">
            <div className="text-left">
              <span className="font-bold">Concepto:</span>
              <p className="whitespace-pre-wrap">{entry.concept}</p>
            </div>
            <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t border-dashed border-neutral-400">
              <span className="font-bold">MONTO INGRESADO:</span>
              <span className="font-bold">{formattedAmount}</span>
            </div>
        </div>
        
        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <p className="text-center mt-4">Este es un comprobante de una entrada de efectivo a la caja de la flotilla.</p>
      </div>
    );
});

CashEntryReceiptContent.displayName = "CashEntryReceiptContent";
