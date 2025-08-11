
"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Card, CardContent } from '@/components/ui/card';
import { Check, Eye, Signature, Loader2, AlertTriangle, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { parseDate } from '@/lib/forms';
import { GARANTIA_CONDICIONES_TEXT } from '@/lib/constants/legal-text';
import Link from 'next/link';

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

interface ServiceOrderContentProps {
  service: ServiceRecord;
  onViewImage: (url: string) => void;
  isPublicView?: boolean;
  showSignReception?: boolean;
  showSignDelivery?: boolean;
  onSignClick?: (type: 'reception' | 'delivery') => void;
  isSigning?: boolean;
  activeTab: string;
}

export const ServiceOrderContent = React.forwardRef<HTMLDivElement, ServiceOrderContentProps>(
  ({ service, onViewImage, isPublicView, showSignReception, showSignDelivery, onSignClick, isSigning, activeTab }, ref) => {
    
    const effectiveWorkshopInfo = { ...initialWorkshopInfo, ...service.workshopInfo };
    const vehicle = service.vehicle as Vehicle | undefined;
    
    const serviceDate = parseDate(service.receptionDateTime) || parseDate(service.serviceDate);
    const formattedServiceDate = serviceDate && isValid(serviceDate) ? format(serviceDate, "dd 'de' MMMM 'de' yyyy, HH:mm 'hrs'", { locale: es }) : 'N/A';

    const fuelLevelMap: Record<string, number> = {
        'Vacío': 0, '1/8': 12.5, '1/4': 25, '3/8': 37.5, '1/2': 50,
        '5/8': 62.5, '3/4': 75, '7/8': 87.5, 'Lleno': 100,
    };

    const fuelPercentage = service.fuelLevel ? fuelLevelMap[service.fuelLevel] ?? 0 : 0;
    const getFuelColorClass = (percentage: number) => {
        if (percentage <= 25) return "bg-red-500";
        if (percentage <= 50) return "bg-orange-400";
        if (percentage <= 87.5) return "bg-yellow-400";
        return "bg-green-500";
    };
    const fuelColor = getFuelColorClass(fuelPercentage);
    
    const driver: Driver | undefined = undefined; // Placeholder
    const driverDebt = { totalDebt: 0 }; // Placeholder
    
    const shouldShowNextService = service.nextServiceInfo && service.status === 'Entregado';

    return (
      <div ref={ref} data-format="letter" className="font-sans bg-white text-black text-sm h-full w-full print:p-0">
        <div className="flex flex-col min-h-full relative print:p-0">
          {service.status === 'Cancelado' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-red-500 text-7xl md:text-9xl font-black opacity-20 transform -rotate-12 select-none">
                CANCELADO
              </span>
            </div>
          )}
          <header className="mb-2 pb-2 border-b-2 border-black">
            <div className="flex justify-between items-start gap-2">
              <div className="relative w-[150px] h-[50px]">
                  <Image src={effectiveWorkshopInfo.logoUrl} alt={`${effectiveWorkshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" crossOrigin="anonymous" priority />
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold">ORDEN DE SERVICIO</h1>
                <p className="font-mono text-base">Folio: <span className="font-bold">{service.id}</span></p>
              </div>
            </div>
            <div className="flex justify-between items-end mt-1 text-xs">
               <div className="space-y-0 leading-tight">
                  <p className="font-bold text-base">{effectiveWorkshopInfo.name}</p>
                  <p>{effectiveWorkshopInfo.addressLine1}</p>
                  {effectiveWorkshopInfo.addressLine2 && <p>{effectiveWorkshopInfo.addressLine2}</p>}
                  <p>{effectiveWorkshopInfo.cityState}</p>
                  <p>Tel: {effectiveWorkshopInfo.phone}</p>
               </div>
               <div className="text-right text-[10px]">
                  <p><span className="font-bold">Fecha de Recepción:</span> {formattedServiceDate}</p>
               </div>
            </div>
          </header>

          <main className="flex-grow">
             <section className="mb-4 text-sm border-b-2 border-black pb-2">
              <p className="font-bold text-lg">{capitalizeWords(vehicle?.ownerName || '')}</p>
              <p className="font-semibold text-base">{vehicle?.ownerPhone || ''}</p>
              <div className="mt-2 flex justify-between items-end">
                  <p className="font-bold text-lg">{vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'N/A'}</p>
                  <p className="font-bold text-xl px-2 py-1 bg-gray-200 rounded-md">{vehicle?.licensePlate || 'N/A'}</p>
              </div>
            </section>

            {driverDebt.totalDebt > 0 && (
              <div className="my-2 p-2 border-2 border-red-500 bg-red-50 rounded-md text-red-800">
                  <h4 className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>AVISO DE ADEUDO</h4>
                  <p className="text-xs mt-1">
                      Este conductor presenta un adeudo con la flotilla por un total de <strong>{formatCurrency(driverDebt.totalDebt)}</strong>.
                  </p>
              </div>
            )}


            <section className="border-2 border-black rounded-md overflow-hidden mb-2">
                <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">TRABAJOS A REALIZAR</h3>
                <div className="p-2 space-y-1 text-xs min-h-[8rem]">
                  {service.serviceItems && service.serviceItems.length > 0 ? (
                    service.serviceItems.map((item, index) => {
                        const isLastItem = index === service.serviceItems.length - 1;
                        return (
                            <div key={index} className={cn("pb-1", !isLastItem && "border-b border-dashed border-gray-300")}>
                                <div className="flex justify-between items-center font-bold text-sm">
                                    <p>{item.name}</p>
                                    <p>{formatCurrency(item.price)}</p>
                                </div>
                                {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                    <ul className="list-disc list-inside pl-2 text-gray-600">
                                        {item.suppliesUsed.map((supply, sIndex) => (
                                            <li key={sIndex}>{supply.quantity} x {supply.supplyName}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })
                  ) : (
                    <p className="text-gray-600 italic">No se especificaron trabajos.</p>
                  )}
                </div>
            </section>
            
            <section className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 text-xs">
                <div className="border-2 border-black rounded-md overflow-hidden md:col-span-3 flex flex-col">
                   <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">CONDICIONES DEL VEHÍCULO</h3>
                   <p className="whitespace-pre-wrap p-2 text-base flex-grow">{service.vehicleConditions || 'No especificado.'}</p>
                </div>
                <div className="border-2 border-black rounded-md overflow-hidden md:col-span-1 flex flex-col">
                    <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">PERTENENCIAS</h3>
                    <p className="whitespace-pre-wrap p-2 text-base flex-grow">{service.customerItems || 'No especificado.'}</p>
                </div>
                <div className="border-2 border-black rounded-md overflow-hidden md:col-span-1 flex flex-col justify-center min-h-[60px]">
                    <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">COMBUSTIBLE</h3>
                    <div className="flex-grow flex flex-col items-center justify-center p-2">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                          <div className={cn("h-full transition-all", fuelColor)} style={{ width: `${fuelPercentage}%` }} />
                      </div>
                      <div className="w-full flex justify-between text-base mt-0.5 px-0.5">
                          <span>E</span>
                          <span>F</span>
                      </div>
                      <span className="font-semibold text-sm mt-1">{service.fuelLevel || 'N/A'}</span>
                    </div>
                </div>
            </section>
             <section className="mt-auto pt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="border-2 border-black rounded-md overflow-hidden flex flex-col justify-between items-center p-1 min-h-[180px] col-span-1">
                      <h3 className="font-bold p-1 w-full bg-gray-700 text-white text-xs text-center rounded-sm">ASESOR</h3>
                      <div className="flex-grow flex items-center justify-center w-full min-h-[50px]">
                          {service.serviceAdvisorSignatureDataUrl && (
                              <div className="relative w-full h-full">
                                  <Image
                                    src={normalizeDataUrl(service.serviceAdvisorSignatureDataUrl)}
                                    alt="Firma del asesor"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                    crossOrigin="anonymous"
                                    priority
                                  />
                              </div>
                          )}
                      </div>
                      <div className="w-full text-center mt-auto pt-1 leading-tight">
                          <p className="font-bold text-sm leading-tight">{capitalizeWords(service.serviceAdvisorName || '')}</p>
                      </div>
                  </div>
                  <div className="border-2 border-black rounded-md overflow-hidden flex flex-col justify-between items-center p-1 min-h-[180px]">
                      <h3 className="font-bold p-1 w-full bg-gray-700 text-white text-xs text-center rounded-sm">ENTRADA AL TALLER</h3>
                      <div className="flex-grow flex items-center justify-center w-full min-h-[50px]">
                          {service.customerSignatureReception ? (
                              <div className="relative w-full h-full">
                                  <Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma de recepción" fill style={{objectFit: 'contain'}} unoptimized crossOrigin="anonymous" priority />
                              </div>
                          ) : (
                              isPublicView && showSignReception && onSignClick && (
                                  <Button onClick={() => onSignClick('reception')} disabled={isSigning} className="mb-2">
                                      {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                                      Firmar Aquí
                                  </Button>
                              )
                          )}
                      </div>
                      <div className="w-full text-center mt-auto pt-1 leading-tight">
                          <p className="font-bold text-sm leading-tight">{capitalizeWords(vehicle?.ownerName || '')}</p>
                          <p className="text-[7px] text-gray-600">
                            Al firmar, acepto los <Link href="/legal/terminos" target="_blank" className="underline">Términos y Condiciones</Link> y el <Link href="/legal/privacidad" target="_blank" className="underline">Aviso de Privacidad</Link> para la realización del servicio.
                          </p>
                      </div>
                  </div>
                  <div className="border-2 border-black rounded-md overflow-hidden flex flex-col justify-between items-center p-1 min-h-[180px]">
                      <h3 className="font-bold p-1 w-full bg-gray-700 text-white text-xs text-center rounded-sm">SALIDA DEL TALLER</h3>
                      <div className="flex-grow flex items-center justify-center w-full min-h-[50px]">
                          {service.customerSignatureDelivery ? (
                              <div className="relative w-full h-full">
                              <Image src={normalizeDataUrl(service.customerSignatureDelivery)} alt="Firma de conformidad" fill style={{objectFit: 'contain'}} unoptimized crossOrigin="anonymous" priority />
                              </div>
                          ) : (
                              isPublicView && showSignDelivery && onSignClick && (
                                  <Button onClick={() => onSignClick('delivery')} disabled={isSigning} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
                                      {isSigning ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <Signature className="mr-2 h-3 w-3"/>}
                                      Firmar de Conformidad
                                  </Button>
                              )
                          )}
                      </div>
                      <div className="w-full text-center mt-auto pt-1 leading-tight">
                          <p className="font-bold text-sm leading-tight">{capitalizeWords(vehicle?.ownerName || '')}</p>
                          <p className="text-[7px] text-gray-600">{GARANTIA_CONDICIONES_TEXT}</p>
                      </div>
                  </div>
             </section>
          </main>
          
          <footer className="mt-auto pt-2 text-xs">
             <section className="mt-2 text-center text-gray-500 text-[10px] space-x-4">
                <Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link>
                <span>|</span>
                <Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link>
             </section>
             {effectiveWorkshopInfo.fixedFooterText && (
              <div className="text-center mt-2 pt-2 border-t border-gray-200">
                <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">{effectiveWorkshopInfo.fixedFooterText}</p>
              </div>
            )}
          </footer>
        </div>
      </div>
    );
  }
);
ServiceOrderContent.displayName = "ServiceOrderContent";
