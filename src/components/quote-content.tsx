
"use client";

import type { QuoteRecord, Vehicle, Technician } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';

const initialWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png" 
};

type WorkshopInfoType = typeof initialWorkshopInfo;

interface QuoteContentProps {
  quote: QuoteRecord;
  vehicle?: Vehicle; 
  preparedByTechnician?: Technician; 
  previewWorkshopInfo?: WorkshopInfoType; 
}

const IVA_RATE = 0.16; 
const LOCALSTORAGE_KEY = 'workshopTicketInfo';

export const QuoteContent = React.forwardRef<HTMLDivElement, QuoteContentProps>(
  ({ quote, vehicle, preparedByTechnician, previewWorkshopInfo }, ref) => {
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfoType>(initialWorkshopInfo);

  useEffect(() => {
    if (previewWorkshopInfo) {
      setWorkshopInfo({...initialWorkshopInfo, ...previewWorkshopInfo});
    } else {
      if (typeof window !== 'undefined') {
        const storedInfo = localStorage.getItem(LOCALSTORAGE_KEY);
        if (storedInfo) {
          try {
            setWorkshopInfo({...initialWorkshopInfo, ...JSON.parse(storedInfo)});
          } catch (e) {
            console.error("Failed to parse workshop info from localStorage", e);
            setWorkshopInfo(initialWorkshopInfo);
          }
        } else {
          setWorkshopInfo(initialWorkshopInfo);
        }
      } else {
        setWorkshopInfo(initialWorkshopInfo);
      }
    }
  }, [previewWorkshopInfo]);

  const now = new Date();
  const formattedPrintDate = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });
  const quoteDate = parseISO(quote.quoteDate ?? "");
  const formattedQuoteDate = isValid(quoteDate) ? format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderLine = (label: string, value: string | number | undefined, isBoldValue: boolean = false, valueClass?: string) => (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-700">{label}</span>
      <span className={`${isBoldValue ? "font-semibold" : ""} ${valueClass || 'text-gray-900'}`}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </span>
    </div>
  );

  const validityDays = 15; 
  const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, validityDays), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

  return (
    <div 
      ref={ref}
      className="font-sans bg-white text-black shadow-lg printable-quote printable-content mx-auto w-[794px] min-h-[1020px] p-16 text-sm"
    >
      <header className="flex justify-between items-start mb-8 border-b border-gray-300 pb-4">
        <div>
          {/* Using a standard img tag for better compatibility with html2pdf */}
          <img 
            src={workshopInfo.logoUrl} 
            alt={`${workshopInfo.name} Logo`} 
            style={{ width: '180px', height: 'auto', marginBottom: '0.75rem' }} 
            data-ai-hint="workshop logo"
          />
          <h1 className="text-2xl font-bold text-gray-800">{workshopInfo.name}</h1>
          <p>{workshopInfo.addressLine1}</p>
          {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
          <p>{workshopInfo.cityState}</p>
          <p>Tel: {workshopInfo.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-semibold text-primary">COTIZACIÓN</h2>
          <p className="mt-2">Folio: <span className="font-medium">{quote.id}</span></p>
          <p>Fecha: <span className="font-medium">{formattedQuoteDate}</span></p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Cliente:</h3>
          <p>{vehicle?.ownerName || 'N/A'}</p>
          <p>{vehicle?.ownerPhone || 'N/A'}</p>
          <p>{vehicle?.ownerEmail || 'N/A'}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Vehículo:</h3>
          <p>{vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : quote.vehicleIdentifier || 'N/A'}</p>
          <p>Placas: {vehicle?.licensePlate || 'N/A'}</p>
          <p>VIN: {vehicle?.vin || 'N/A'}</p>
          {quote.mileage !== undefined && <p>Kilometraje: {quote.mileage.toLocaleString('es-ES')} km</p>}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="font-semibold text-base text-gray-700 mb-2 border-b pb-2">Descripción del Trabajo a Realizar:</h3>
        <p className="text-gray-800 whitespace-pre-wrap">{quote.description}</p>
      </section>

      {quote.suppliesProposed && quote.suppliesProposed.length > 0 && (
        <section className="mb-8">
          <h3 className="font-semibold text-base text-gray-700 mb-3">Refacciones y Materiales Propuestos (Precios con IVA):</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-100">
                <th className="py-2 px-3 font-semibold text-gray-600">Cantidad</th>
                <th className="py-2 px-3 font-semibold text-gray-600">Descripción</th>
                <th className="py-2 px-3 font-semibold text-gray-600 text-right">Precio Unit.</th>
                <th className="py-2 px-3 font-semibold text-gray-600 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {quote.suppliesProposed.map((supply, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-2 px-3">{supply.quantity}</td>
                  <td className="py-2 px-3">{supply.supplyName || `ID: ${supply.supplyId}`}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(supply.unitPrice)}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency((supply.unitPrice || 0) * supply.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      
      <section className="flex justify-end mb-8">
        <div className="w-full max-w-sm space-y-2 text-base">
          {quote.estimatedSubTotal !== undefined && renderLine("Subtotal:", formatCurrency(quote.estimatedSubTotal))}
          {quote.estimatedTaxAmount !== undefined && renderLine(`IVA (${(IVA_RATE * 100).toFixed(0)}%):`, formatCurrency(quote.estimatedTaxAmount))}
          {renderLine("Total Estimado:", formatCurrency(quote.estimatedTotalCost), true, "text-xl text-primary font-bold border-t-2 pt-2 border-gray-300")}
        </div>
      </section>

      <footer className="text-xs text-gray-600 mt-auto border-t border-gray-300 pt-4">
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-1">Notas y Condiciones:</h4>
          <p>
            {`Cotización realizada por: ${quote.preparedByTechnicianName || 'N/A'}. `}
            Precios en MXN. Esta cotización es válida hasta el {validityDate}. Esta cotización no incluye trabajos no especificados.
          </p>
        </div>
        <div className="text-left space-y-1">
            <p className="font-semibold">¡Gracias por confiar en Ranoro!</p>
            <p>
            Valoramos sinceramente la oportunidad de atender su vehículo. Nos comprometemos a brindarle un servicio honesto, transparente y de la más alta calidad. Si tiene alguna pregunta, contáctenos, estaremos encantados de ayudarle.
            </p>
            <p className="print-block hidden pt-2">Impreso el: {formattedPrintDate}</p>
        </div>
      </footer>
    </div>
  );
});

QuoteContent.displayName = "QuoteContent";
