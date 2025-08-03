

"use client";

import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import type { WorkshopInfo, CashDrawerTransaction } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import Image from 'next/image';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png"
};
const LOCALSTORAGE_KEY = 'workshopTicketInfo';

interface CorteCajaData {
    initialBalance: number;
    totalCashSales: number;
    totalCashIn: number;
    totalCashOut: number;
    finalCashBalance: number;
    salesByPaymentMethod: Record<string, number>;
    totalSales: number;
    totalServices: number;
}

interface CorteCajaContentProps {
  reportData: CorteCajaData;
  date: Date;
  transactions: CashDrawerTransaction[];
  previewWorkshopInfo?: WorkshopInfo;
}

export const CorteDiaContent = React.forwardRef<HTMLDivElement, CorteCajaContentProps>(({ reportData, date, transactions, previewWorkshopInfo }, ref) => {
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo>(initialWorkshopInfo);

  useEffect(() => {
    if (previewWorkshopInfo) {
      setWorkshopInfo(previewWorkshopInfo);
    } else {
      const storedInfo = localStorage.getItem(LOCALSTORAGE_KEY);
      if (storedInfo) {
        try {
          setWorkshopInfo(JSON.parse(storedInfo));
        } catch (e) {
          console.error("Failed to parse workshop info from localStorage", e);
        }
      }
    }
  }, [previewWorkshopInfo]);

  const now = new Date();
  const formattedPrintDate = format(now, "dd/MM/yyyy HH:mm:ss", { locale: es });
  const reportDateFormatted = isValid(date) 
    ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: es }) 
    : 'Fecha Inválida';

  const renderLine = (label: string, value: string, isBoldValue: boolean = false, isTotal: boolean = false, className?: string) => (
    <div className={cn(`flex justify-between text-xs`, isTotal ? 'py-1' : 'py-0.5', className)}>
      <span>{label}</span>
      <span className={isBoldValue ? "font-semibold" : ""}>{value}</span>
    </div>
  );

  const renderDashedLine = () => (
    <div className="border-t border-dashed border-neutral-400 my-1"></div>
  );

  return (
    <div 
      ref={ref}
      data-format="receipt"
      className="font-mono bg-white text-black p-2 ticket-preview-content max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0"
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
        <h1 className="text-lg font-bold">{workshopInfo.name}</h1>
        <p>{workshopInfo.addressLine1}</p>
        {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
        {workshopInfo.cityState && <p>{workshopInfo.cityState}</p>}
        <p>Tel: {workshopInfo.phone}</p>
      </div>

      <p className="text-xs">Impreso: {formattedPrintDate}</p>
      <div className="text-center font-semibold my-1 text-sm">CORTE DE CAJA</div>
      <p className="text-xs text-center mb-1">Fecha del Corte: {reportDateFormatted}</p>
      
      {renderDashedLine()}
      <div className="font-semibold my-1">RESUMEN DE CAJA</div>
      {renderLine("Saldo Inicial:", formatCurrency(reportData.initialBalance))}
      {renderLine("(+) Ventas en Efectivo:", formatCurrency(reportData.totalCashSales), false, false, "text-green-700")}
      {renderLine("(+) Entradas:", formatCurrency(reportData.totalCashIn), false, false, "text-green-700")}
      {renderLine("(-) Salidas:", formatCurrency(reportData.totalCashOut), false, false, "text-red-700")}
      {renderDashedLine()}
      {renderLine("SALDO FINAL ESPERADO:", formatCurrency(reportData.finalCashBalance), true, true)}
      
      {renderDashedLine()}
      <div className="font-semibold my-1">DESGLOSE DE VENTAS</div>
      {Object.entries(reportData.salesByPaymentMethod).map(([method, total]) => (
        <div key={method} className="flex justify-between text-xs py-0.5">
          <span>{`${method}:`}</span>
          <span>{formatCurrency(total)}</span>
        </div>
      ))}
       {renderDashedLine()}
      <div className="font-semibold my-1">TRANSACCIONES MANUALES</div>
      {transactions.length > 0 ? (
        transactions.map(t => (
            <div key={t.id} className="text-xs py-0.5">
                <div className="flex justify-between">
                  <span>{t.type === 'Entrada' ? '(+)' : '(-)'} {t.concept}</span>
                  <span className={cn(t.type === 'Entrada' ? 'text-green-700' : 'text-red-700')}>{formatCurrency(t.amount)}</span>
                </div>
                <div className="text-right text-neutral-500">{t.userName}</div>
            </div>
        ))
      ) : <p className="text-xs text-center text-neutral-500">Sin movimientos manuales</p>}
      
      {renderDashedLine()}
      <p className="text-center text-xs mt-2">Fin del Reporte</p>
    </div>
  );
});
CorteDiaContent.displayName = "CorteDiaContent";
