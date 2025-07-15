
"use client";

import type { QuoteRecord, Vehicle, Technician, WorkshopInfo, Driver, RentalPayment } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { cn, capitalizeWords, normalizeDataUrl, calculateDriverDebt, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CalendarCheck } from 'lucide-react';
import { placeholderDrivers, placeholderRentalPayments } from '@/lib/placeholder-data';
import Image from 'next/image';
import { parseDate } from '@/lib/forms';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
  footerLine1: "¡Gracias por su preferencia!",
  footerLine2: "Para dudas o aclaraciones, no dude en contactarnos.",
  fixedFooterText: "© 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
};


interface QuoteContentProps {
  quote: QuoteRecord;
  vehicle?: Vehicle; 
  workshopInfo?: WorkshopInfo;
}

const IVA_RATE = 0.16; 

export const QuoteContent = React.forwardRef<HTMLDivElement, QuoteContentProps>(
  ({ quote, vehicle, workshopInfo: workshopInfoProp }, ref) => {
    const effectiveWorkshopInfo = { ...initialWorkshopInfo, ...workshopInfoProp };
    
    const now = new Date();
    const formattedPrintDate = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });
    const quoteDate = parseDate(quote.quoteDate) || now; // Fallback to now if quoteDate is not available
    const formattedQuoteDate = isValid(quoteDate) ? format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const validityDays = 15; 
    const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, validityDays), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const driver: Driver | undefined = vehicle?.isFleetVehicle 
        ? placeholderDrivers.find(d => d.assignedVehicleId === vehicle.id) 
        : undefined;

    const driverDebt = driver && vehicle ? calculateDriverDebt(driver, placeholderRentalPayments, [vehicle]) : { totalDebt: 0, rentalDebt: 0, depositDebt: 0, manualDebt: 0 };


    return (
      <div 
        ref={ref}
        data-format="letter"
        className="font-sans bg-white text-black shadow-lg mx-auto p-4 md:p-8 text-sm flex flex-col print:shadow-none"
      >
        <header className="mb-4 pb-2 border-b-2 border-black">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <Image 
              src={effectiveWorkshopInfo.logoUrl} 
              alt={`${effectiveWorkshopInfo.name} Logo`} 
              width={150}
              height={50}
              style={{ objectFit: 'contain' }}
              data-ai-hint="workshop logo"
              crossOrigin="anonymous"
            />
            <h2 className="text-2xl sm:text-3xl font-semibold text-primary text-left sm:text-right w-full sm:w-auto">COTIZACIÓN</h2>
          </div>

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

        <main className="flex-grow">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 text-xs">
              <div className="border-2 border-black rounded-md overflow-hidden flex-1">
                <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">DATOS DEL CLIENTE</h3>
                <div className="space-y-0.5 p-2 text-sm">
                  <p><span className="font-semibold">Nombre:</span> <span className="font-bold">{vehicle?.ownerName?.toUpperCase() || ''}</span></p>
                  <p><span className="font-semibold">Teléfono:</span> <span className="font-bold">{vehicle?.ownerPhone || ''}</span></p>
                  {vehicle?.ownerEmail && <p><span className="font-semibold">Email:</span> <span className="font-bold">{vehicle.ownerEmail}</span></p>}
                </div>
              </div>
              <div className="border-2 border-black rounded-md overflow-hidden flex-1">
                  <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">DATOS DEL VEHÍCULO</h3>
                  <div className="space-y-0.5 p-2 text-sm">
                      <p><span className="font-semibold">Vehículo:</span> <span className="font-bold">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}</span></p>
                      <p><span className="font-semibold">Placas:</span> <span className="font-bold">{vehicle?.licensePlate || 'N/A'}</span></p>
                      {vehicle?.color && <p><span className="font-semibold">Color:</span> <span className="font-bold">{vehicle.color}</span></p>}
                      {quote.mileage !== undefined && <p><span className="font-semibold">Kilometraje:</span> <span className="font-bold">{quote.mileage.toLocaleString('es-ES')} km</span></p>}
                  </div>
              </div>
              {quote.nextServiceInfo && quote.status === 'Entregado' && (
                  <div className="border-2 border-red-700 rounded-md overflow-hidden flex-1">
                    <h3 className="font-bold p-1 bg-red-700 text-white text-xs text-center">PRÓXIMO SERVICIO</h3>
                    <div className="p-2 space-y-1 text-center text-sm">
                        <p className="text-[10px] font-semibold">Lo que ocurra primero</p>
                        {quote.nextServiceInfo.date && isValid(parseDate(quote.nextServiceInfo.date)) && (
                            <p className="font-bold">Fecha: {format(parseDate(quote.nextServiceInfo.date)!, "dd/MMMM/yyyy", { locale: es })}</p>
                        )}
                        {quote.nextServiceInfo.mileage && (
                            <p className="font-bold">Kilometraje: {quote.nextServiceInfo.mileage.toLocaleString('es-MX')} km</p>
                        )}
                    </div>
                  </div>
              )}
          </section>

          {driverDebt.totalDebt > 0 && (
            <div className="my-4 p-3 border-2 border-red-500 bg-red-50 rounded-md text-red-800">
                <h4 className="font-bold text-base flex items-center gap-2"><AlertCircle className="h-5 w-5"/>AVISO IMPORTANTE DE ADEUDO</h4>
                <p className="text-sm mt-1">
                    Este conductor presenta un adeudo con la flotilla por un total de <strong>{formatCurrency(driverDebt.totalDebt)}</strong>.
                </p>
                <ul className="text-xs list-disc pl-5 mt-1">
                    {driverDebt.depositDebt > 0 && <li>Deuda de depósito: {formatCurrency(driverDebt.depositDebt)}</li>}
                    {driverDebt.rentalDebt > 0 && <li>Deuda de renta: {formatCurrency(driverDebt.rentalDebt)}</li>}
                    {driverDebt.manualDebt > 0 && <li>Deudas manuales: {formatCurrency(driverDebt.manualDebt)}</li>}
                </ul>
            </div>
          )}

          <Card className="mt-4 mb-4 border-2 border-gray-200 overflow-hidden">
            <h3 className="font-semibold text-white bg-gray-700 p-2" style={{ fontSize: '14px' }}>TRABAJOS A REALIZAR (Precios con IVA)</h3>
            <CardContent className="p-4 space-y-4">
              <section>
                <div className="space-y-2 pt-2" style={{ fontSize: '14px' }}>
                  {quote.serviceItems && quote.serviceItems.length > 0 ? (
                      quote.serviceItems.map((item, index) => (
                          <div key={index} className="pb-2 border-b border-dashed last:border-b-0">
                              <div className="flex justify-between items-center">
                                  <span className="font-bold">{item.name}</span>
                                  <span className="font-bold">{formatCurrency(item.price)}</span>
                              </div>
                              {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                  <p className="text-gray-500 pl-4 mt-1">
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

              <section className="flex flex-col sm:flex-row justify-end pt-4 border-t border-dashed">
                  <div className="w-full sm:max-w-xs md:max-w-sm space-y-1 text-sm">
                      {quote.subTotal !== undefined && (
                          <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-medium">{formatCurrency(quote.subTotal)}</span>
                          </div>
                      )}
                      {quote.taxAmount !== undefined && (
                          <div className="flex justify-between">
                              <span>IVA ({(IVA_RATE * 100).toFixed(0)}%):</span>
                              <span className="font-medium">{formatCurrency(quote.taxAmount)}</span>
                          </div>
                      )}
                      <div className="flex justify-between font-bold pt-1 mt-1 border-t border-gray-300">
                          <span>Total Estimado:</span>
                          <span>{formatCurrency(quote.totalCost)}</span>
                      </div>
                  </div>
              </section>
              
              {quote.notes && (
                <section className="w-full text-left pt-4 border-t border-dashed" style={{ fontSize: '14px' }}>
                  <h4 className="font-semibold text-gray-700 mb-1">Notas Adicionales:</h4>
                  <p className="whitespace-pre-wrap">{quote.notes}</p>
                </section>
              )}
            </CardContent>
          </Card>
        </main>
        
        <footer className="mt-auto">
          <Card className="mt-4 mb-4 border-gray-200">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between min-h-[120px]" style={{ fontSize: '14px' }}>
                <div className="text-left">
                    <p className="font-semibold">¡Gracias por su preferencia!</p>
                    <p>Para dudas o aclaraciones, no dude en contactarnos.</p>
                </div>
                <div className="text-right flex flex-col items-center justify-end mt-4 sm:mt-0">
                    <div className="relative flex justify-center items-center h-16 w-40 mb-1">
                        {quote.serviceAdvisorSignatureDataUrl && (
                           <Image
                                src={normalizeDataUrl(quote.serviceAdvisorSignatureDataUrl)}
                                alt="Firma del asesor"
                                width={200}
                                height={80}
                                style={{ objectFit: 'contain' }}
                                crossOrigin="anonymous"
                            />
                        )}
                    </div>
                    <div className="border-t-2 border-gray-300/30 pt-1 w-56 text-center">
                        <p className="font-bold">
                           ASESOR: {capitalizeWords((quote.serviceAdvisorName || '').toLowerCase()) || '________________________________'}
                        </p>
                    </div>
                </div>
            </CardContent>
          </Card>

          <section className="pt-4" style={{paddingBottom: '0'}}>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">Términos y Condiciones:</h4>
            <p className="text-xs text-gray-600 leading-snug">
                {`Precios en MXN. Esta cotización es válida hasta el ${validityDate}. `}
                No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Los precios aquí detallados están sujetos a cambios sin previo aviso en caso de variaciones en los costos de los insumos proporcionados por nuestros proveedores, los cuales están fuera de nuestro control.
            </p>
            <div className="print-block hidden pt-2">Impreso el: {formattedPrintDate}</div>
          </section>
          
          {effectiveWorkshopInfo.fixedFooterText && (
             <div className="text-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-[9px] text-muted-foreground whitespace-pre-wrap">{effectiveWorkshopInfo.fixedFooterText}</p>
            </div>
          )}
        </footer>
      </div>
    );
  }
);

QuoteContent.displayName = "QuoteContent";
