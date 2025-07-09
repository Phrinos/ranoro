
"use client";

import type { QuoteRecord, Vehicle, Technician, WorkshopInfo } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import Image from "next/legacy/image";

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
  footerLine1: "¡Gracias por su preferencia!",
  footerLine2: "Para dudas o aclaraciones, no dude en contactarnos.",
  fixedFooterText: "© 2024 Ranoro®\nSistema de Administracion de Talleres\nTodos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
};


interface QuoteContentProps {
  quote: QuoteRecord;
  vehicle?: Vehicle; 
  preparedByTechnician?: Technician; 
  workshopInfo?: WorkshopInfo; 
}

const IVA_RATE = 0.16; 

export const QuoteContent = React.forwardRef<HTMLDivElement, QuoteContentProps>(
  ({ quote, vehicle, preparedByTechnician, workshopInfo: workshopInfoProp }, ref) => {
    // Directly use the prop if available, otherwise use the initial default.
    // This removes the need for useState and useEffect for workshopInfo.
    const effectiveWorkshopInfo = { ...initialWorkshopInfo, ...workshopInfoProp };

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
        className="font-sans bg-white text-black shadow-lg mx-auto p-4 md:p-8 text-sm flex flex-col"
      >
        <header className="mb-4 border-b border-gray-300 pb-4">
          {/* Top Row: Logo and Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <img 
              src={effectiveWorkshopInfo.logoUrl} 
              alt={`${effectiveWorkshopInfo.name} Logo`} 
              style={{ width: '150px', height: 'auto' }} 
              className="sm:w-[180px]"
              data-ai-hint="workshop logo"
            />
            <h2 className="text-2xl sm:text-3xl font-semibold text-primary text-left sm:text-right w-full sm:w-auto">COTIZACIÓN</h2>
          </div>

          {/* Bottom Row: Address and Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start mt-4 text-xs gap-4">
            <div className="space-y-0 leading-tight">
              <div className="font-bold text-sm mb-1">{effectiveWorkshopInfo.name}</div>
              <div>{effectiveWorkshopInfo.addressLine1}</div>
              {effectiveWorkshopInfo.addressLine2 && <div>{effectiveWorkshopInfo.addressLine2}</div>}
              <div>{effectiveWorkshopInfo.cityState}</div>
              <div>Tel: {effectiveWorkshopInfo.phone}</div>
            </div>
            <div className="text-left sm:text-right space-y-0 leading-tight">
              <div>Folio: <span className="font-semibold">{quote.id}</span></div>
              <div>Fecha: <span className="font-semibold">{formattedQuoteDate}</span></div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-grow">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <h3 className="font-semibold text-sm text-gray-700 mb-1 border-b pb-1">Cliente:</h3>
              <div className="space-y-1 leading-tight pt-1 text-xs sm:text-sm">
                  <div className="font-bold">{vehicle?.ownerName || ''}</div>
                  {vehicle?.ownerPhone && <div>{vehicle.ownerPhone}</div>}
                  {vehicle?.ownerEmail && <div>{vehicle.ownerEmail}</div>}
              </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h3 className="font-semibold text-sm text-gray-700 mb-1 border-b pb-1">Vehículo:</h3>
                <div className="space-y-1 leading-tight pt-1 text-xs sm:text-sm">
                    <div>
                        <span className="font-bold">{vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : (quote.vehicleIdentifier || '').replace(vehicle?.licensePlate || '', '')} </span>
                        <span className="font-bold">{vehicle?.licensePlate || 'N/A'}</span>
                    </div>
                    {quote.mileage !== undefined && (
                        <div>
                            Kilometraje: <span className="font-bold">{quote.mileage.toLocaleString('es-ES')} km</span>
                        </div>
                    )}
                </div>
              </div>
          </section>

          <section className="mt-4 mb-4">
              <h3 className="font-semibold text-base text-gray-700 mb-2 border-b pb-1">TRABAJOS A REALIZAR (Precios con IVA)</h3>
              <div className="space-y-2 pt-2">
                  {quote.serviceItems && quote.serviceItems.length > 0 ? (
                      quote.serviceItems.map((item, index) => (
                          <div key={index} className="pb-2 border-b border-dashed last:border-b-0">
                              <div className="flex justify-between items-center text-sm sm:text-base">
                                  <span className="font-bold">{item.name}</span>
                                  <span className="font-bold">{formatCurrency(item.price)}</span>
                              </div>
                              {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                  <p className="text-xs text-gray-500 pl-4 mt-1">
                                      Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}
                                  </p>
                              )}
                          </div>
                      ))
                  ) : (
                      <p className="text-gray-500 italic">No se especificaron trabajos en esta cotización.</p>
                  )}
              </div>
          </section>
        </main>

        {/* Footer section that will be pushed to the bottom */}
        <footer className="mt-auto pt-4">
          <section className="flex flex-col sm:flex-row justify-end">
              <div className="w-full sm:max-w-xs md:max-w-sm space-y-2 text-sm sm:text-base">
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
                  <div className="flex justify-between text-lg sm:text-xl font-bold border-t-2 pt-2 mt-2 border-gray-300 text-primary">
                      <span>Total Estimado:</span>
                      <span>{formatCurrency(quote.estimatedTotalCost)}</span>
                  </div>
              </div>
          </section>
          
          {quote.notes && (
              <div className="w-full text-left mt-4 border-t border-dashed pt-2">
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Notas Adicionales:</h4>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
              </div>
          )}
          
          <div className="text-center mt-8 pt-4">
              {quote.preparedByTechnicianSignatureDataUrl && (
                  <div className="h-24 w-full max-w-[200px] relative inline-block">
                      <Image src={quote.preparedByTechnicianSignatureDataUrl} alt="Firma del asesor" layout="fill" objectFit="contain" />
                  </div>
              )}
              <div className="border-t-2 border-black mt-2 pt-1 w-64 text-center inline-block">
                  <p className="text-xs font-bold">ASESOR: {quote.preparedByTechnicianName?.toUpperCase() || '________________________________'}</p>
              </div>
          </div>

          <div className="text-xs text-gray-600 mt-6 border-t border-gray-300 pt-4">
              <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-1">Términos y Condiciones:</h4>
              <p className="leading-snug">
                  {`Precios en MXN. Esta cotización es válida hasta el ${validityDate}. `}
                  No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Los precios aquí detallados están sujetos a cambios sin previo aviso en caso de variaciones en los costos de los insumos proporcionados por nuestros proveedores, los cuales están fuera de nuestro control.
              </p>
              </div>
              <div className="text-left space-y-1 leading-snug">
                  <p className="font-semibold">{effectiveWorkshopInfo.footerLine1}</p>
                  <p>{effectiveWorkshopInfo.footerLine2}</p>
                  <p className="print-block hidden pt-2">Impreso el: {formattedPrintDate}</p>
              </div>
          </div>
          {effectiveWorkshopInfo.fixedFooterText && (
             <div className="text-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{effectiveWorkshopInfo.fixedFooterText}</p>
            </div>
          )}
        </footer>
      </div>
    );
  }
);

QuoteContent.displayName = "QuoteContent";
