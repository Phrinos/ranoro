
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
  
  const validityDays = 15; 
  const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, validityDays), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

  return (
    <div 
      ref={ref}
      data-format="letter"
      className="font-sans bg-white text-black shadow-lg printable-quote printable-content mx-auto w-[794px] min-h-[1020px] p-12 text-sm flex flex-col"
    >
      <header className="flex justify-between items-start mb-8 border-b border-gray-300 pb-4">
        <div>
          <img 
            src={workshopInfo.logoUrl} 
            alt={`${workshopInfo.name} Logo`} 
            style={{ width: '180px', height: 'auto', marginBottom: '0.75rem' }} 
            data-ai-hint="workshop logo"
          />
          <div className="space-y-0 leading-tight">
            <div>{workshopInfo.addressLine1}</div>
            {workshopInfo.addressLine2 && <div>{workshopInfo.addressLine2}</div>}
            <div>{workshopInfo.cityState}</div>
            <div>Tel: {workshopInfo.phone}</div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-semibold text-primary">COTIZACIÓN</h2>
          <div className="space-y-0 leading-tight mt-2">
            <div>Folio: <span className="font-medium">{quote.id}</span></div>
            <div>Fecha: <span className="font-medium">{formattedQuoteDate}</span></div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-grow">
        <section className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="font-semibold text-base text-gray-700 mb-2 border-b pb-2">Cliente:</h3>
            <div className="space-y-1 leading-tight pt-2">
                <div>{vehicle?.ownerName || 'N/A'}</div>
                <div>{vehicle?.ownerPhone || 'N/A'}</div>
                <div>{vehicle?.ownerEmail || 'N/A'}</div>
            </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="font-semibold text-base text-gray-700 mb-2 border-b pb-2">Vehículo:</h3>
            <div className="space-y-1 leading-tight pt-2">
                <div>{vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : quote.vehicleIdentifier || 'N/A'}</div>
                <div>Placas: {vehicle?.licensePlate || 'N/A'}</div>
                <div>VIN: {vehicle?.vin || 'N/A'}</div>
                {quote.mileage !== undefined && <div>Kilometraje: {quote.mileage.toLocaleString('es-ES')} km</div>}
            </div>
            </div>
        </section>

        <section className="mb-8">
            <h3 className="font-semibold text-base text-gray-700 mb-2 border-b pb-2">Descripción del Trabajo a Realizar:</h3>
            <p className="text-gray-800 whitespace-pre-wrap pt-2">{quote.description}</p>
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
      </main>

      {/* Footer section that will be pushed to the bottom */}
      <footer className="mt-auto pt-4">
        <section className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-base">
                {quote.estimatedSubTotal !== undefined && (
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(quote.estimatedSubTotal)}</span>
                    </div>
                )}
                {quote.estimatedTaxAmount !== undefined && (
                    <div className="flex justify-between">
                        <span>IVA ({(IVA_RATE * 100).toFixed(0)}%):</span>
                        <span className="font-medium">{formatCurrency(quote.estimatedTaxAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t-2 pt-2 mt-2 border-gray-300 text-primary">
                    <span>Total Estimado:</span>
                    <span>{formatCurrency(quote.estimatedTotalCost)}</span>
                </div>
            </div>
        </section>

        <div className="text-xs text-gray-600 mt-6 border-t border-gray-300 pt-4">
            <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-1">Notas y Condiciones:</h4>
            <p className="leading-snug">
                {`Cotización realizada por: ${quote.preparedByTechnicianName || 'N/A'}. `}
                Precios en MXN. Esta cotización es válida hasta el {validityDate}. Esta cotización no incluye trabajos no especificados.
            </p>
            {quote.notes && <p className="leading-snug mt-1">Notas adicionales: {quote.notes}</p>}
            </div>
            <div className="text-left space-y-1 leading-snug">
                <p className="font-semibold">¡Gracias por confiar en Ranoro!</p>
                <p>
                Valoramos sinceramente la oportunidad de atender su vehículo. Nos comprometemos a brindarle un servicio honesto, transparente y de la más alta calidad. Si tiene alguna pregunta, contáctenos, estaremos encantados de ayudarle.
                </p>
                <p className="print-block hidden pt-2">Impreso el: {formattedPrintDate}</p>
            </div>
        </div>
      </footer>
    </div>
  );
});

QuoteContent.displayName = "QuoteContent";
