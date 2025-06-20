
"use client";

import type { QuoteRecord, Vehicle, Technician } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

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

export function QuoteContent({ quote, vehicle, preparedByTechnician, previewWorkshopInfo }: QuoteContentProps) {
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
  const quoteDate = parseISO(quote.quoteDate);
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

  const validityDays = 30; 
  const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, validityDays), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

  return (
    // printable-quote and quote-preview-content classes used for print styling
    <div className="font-sans bg-white text-black p-6 printable-quote quote-preview-content max-w-4xl mx-auto text-sm print:text-base">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b pb-4">
        <div>
          <Image 
            src={workshopInfo.logoUrl} 
            alt={`${workshopInfo.name} Logo`} 
            width={150} 
            height={50} 
            className="mb-2"
            data-ai-hint="workshop logo"
            priority={typeof window === 'undefined'} 
            />
          <h1 className="text-2xl font-bold text-gray-800">{workshopInfo.name}</h1>
          <p>{workshopInfo.addressLine1}</p>
          {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
          <p>{workshopInfo.cityState}</p>
          <p>Tel: {workshopInfo.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-primary">COTIZACIÓN</h2>
          <p>Folio: <span className="font-medium">{quote.id}</span></p>
          <p>Fecha: <span className="font-medium">{formattedQuoteDate}</span></p>
        </div>
      </div>

      {/* Client and Vehicle Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-1">Cliente:</h3>
          <p>{vehicle?.ownerName || 'N/A'}</p>
          <p>{vehicle?.ownerPhone || 'N/A'}</p>
          <p>{vehicle?.ownerEmail || 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-700 mb-1">Vehículo:</h3>
          <p>{vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : quote.vehicleIdentifier || 'N/A'}</p>
          <p>Placas: {vehicle?.licensePlate || 'N/A'}</p>
          <p>VIN: {vehicle?.vin || 'N/A'}</p>
          {quote.mileage !== undefined && <p>Kilometraje: {quote.mileage.toLocaleString('es-ES')} km</p>}
        </div>
      </div>

      {/* Description of Work */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-1">Descripción del Trabajo a Realizar:</h3>
        <p className="text-gray-800 whitespace-pre-wrap">{quote.description}</p>
      </div>

      {/* Supplies / Parts */}
      {quote.suppliesProposed && quote.suppliesProposed.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Refacciones y Materiales Propuestos (Precios con IVA):</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-1 px-2 font-medium text-gray-600">Cantidad</th>
                <th className="py-1 px-2 font-medium text-gray-600">Descripción</th>
                <th className="py-1 px-2 font-medium text-gray-600 text-right">Precio Unit.</th>
                <th className="py-1 px-2 font-medium text-gray-600 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {quote.suppliesProposed.map((supply, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-1 px-2">{supply.quantity}</td>
                  <td className="py-1 px-2">{supply.supplyName || `ID: ${supply.supplyId}`}</td>
                  <td className="py-1 px-2 text-right">{formatCurrency(supply.unitPrice)}</td>
                  <td className="py-1 px-2 text-right">{formatCurrency((supply.unitPrice || 0) * supply.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-full max-w-xs space-y-1">
          {quote.estimatedSubTotal !== undefined && renderLine("Subtotal:", formatCurrency(quote.estimatedSubTotal))}
          {quote.estimatedTaxAmount !== undefined && renderLine(`IVA (${(IVA_RATE * 100).toFixed(0)}%):`, formatCurrency(quote.estimatedTaxAmount))}
          {renderLine("Total Estimado:", formatCurrency(quote.estimatedTotalCost), true, "text-lg text-primary")}
        </div>
      </div>

      {/* Notes and Terms */}
      {(quote.notes || preparedByTechnician || validityDays > 0) && (
        <div className="mb-6 border-t pt-4">
          {quote.notes && (
            <>
              <h4 className="font-semibold text-gray-700 mb-1">Notas Adicionales:</h4>
              <p className="text-xs text-gray-600 whitespace-pre-wrap mb-2">{quote.notes}</p>
            </>
          )}
           {isValid(quoteDate) && validityDays > 0 && (
             <p className="text-xs text-gray-600 mb-1">Esta cotización es válida hasta el {validityDate}. Precios sujetos a cambio sin previo aviso después de esta fecha.</p>
           )}
          <p className="text-xs text-gray-600">Precios en MXN. Esta cotización no incluye trabajos no especificados.</p>
          {preparedByTechnician && <p className="text-xs text-gray-600 mt-2">Preparado por: {preparedByTechnician.name}</p>}
        </div>
      )}
      
      {/* Footer */}
      <div className="text-center text-xs text-gray-500 border-t pt-4">
        <p>¡Gracias por considerar nuestros servicios!</p>
        <p className="print-block hidden">Impreso el: {formattedPrintDate}</p>
      </div>
    </div>
  );
}
