
"use client";

import type { SaleReceipt, ServiceRecord } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';

const initialWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
};

type WorkshopInfoType = typeof initialWorkshopInfo;
const LOCALSTORAGE_KEY = 'workshopTicketInfo';

interface CorteDiaData {
  date: string;
  salesByPaymentMethod: Record<string, number>;
  totalSales: number;
  totalCompletedServices: number;
  grandTotal: number;
}

interface CorteDiaContentProps {
  reportData: CorteDiaData;
  previewWorkshopInfo?: WorkshopInfoType; // For potential future use if ticket config applies here
}

export function CorteDiaContent({ reportData, previewWorkshopInfo }: CorteDiaContentProps) {
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfoType>(initialWorkshopInfo);

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
          setWorkshopInfo(initialWorkshopInfo);
        }
      } else {
        setWorkshopInfo(initialWorkshopInfo);
      }
    }
  }, [previewWorkshopInfo]);

  const now = new Date();
  const formattedPrintDate = format(now, "dd/MM/yyyy HH:mm:ss", { locale: es });

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderLine = (label: string, value: string, isBoldValue: boolean = false, isTotal: boolean = false) => (
    <div className={`flex justify-between text-xs ${isTotal ? 'py-1' : 'py-0.5'}`}>
      <span>{label}</span>
      <span className={isBoldValue ? "font-semibold" : ""}>{value}</span>
    </div>
  );

  const renderDashedLine = () => (
    <div className="border-t border-dashed border-neutral-400 my-1"></div>
  );

  const reportDateFormatted = isValid(parseISO(reportData.date)) 
    ? format(parseISO(reportData.date), "dd 'de' MMMM 'de' yyyy", { locale: es }) 
    : 'Fecha Inválida';

  return (
    <div className="font-mono bg-white text-black p-2 ticket-preview-content max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0">
      <div className="text-center mb-2">
        <h1 className="text-lg font-bold">{workshopInfo.name}</h1>
        <p>{workshopInfo.addressLine1}</p>
        {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
        <p>{workshopInfo.cityState}</p>
        <p>Tel: {workshopInfo.phone}</p>
      </div>

      <p className="text-xs">Impreso: {formattedPrintDate}</p>
      <div className="text-center font-semibold my-1 text-sm">CORTE DEL DÍA</div>
      <p className="text-xs text-center mb-1">Fecha del Corte: {reportDateFormatted}</p>
      
      {renderDashedLine()}
      <div className="font-semibold my-1">RESUMEN DE VENTAS (POS)</div>
      {Object.entries(reportData.salesByPaymentMethod).map(([method, total]) => 
        renderLine(`${method}:`, formatCurrency(total))
      )}
      {renderLine("Total Ventas (POS):", formatCurrency(reportData.totalSales), true)}
      
      {renderDashedLine()}
      <div className="font-semibold my-1">SERVICIOS COMPLETADOS</div>
      {renderLine("Total Servicios:", formatCurrency(reportData.totalCompletedServices), true)}
      
      {renderDashedLine()}
      {renderLine("GRAN TOTAL DEL DÍA:", formatCurrency(reportData.grandTotal), true, true)}
      
      {renderDashedLine()}
      <p className="text-center text-xs mt-2">Fin del Reporte</p>
    </div>
  );
}
