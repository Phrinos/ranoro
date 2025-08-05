
"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Card, CardContent } from '@/components/ui/card';
import { Check, Eye, Signature, Loader2, AlertCircle, CalendarCheck } from 'lucide-react';
import { QuoteContent } from '@/components/quote-content';
import { Button } from '@/components/ui/button';
import { placeholderDrivers, placeholderRentalPayments } from '@/lib/placeholder-data';
import Image from 'next/image';
import { parseDate } from '@/lib/forms';
import { Badge } from '@/components/ui/badge';
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

const inspectionGroups = [
  { title: "LUCES", items: [
    { name: "luces_altas_bajas_niebla", label: "1. ALTAS, BAJAS Y NIEBLA" },
    { name: "luces_cuartos", label: "2. CUARTOS DELANTEROS, TRASEROS Y LATERALES" },
    { name: "luces_direccionales", label: "3. DIRECCIONALES E INTERMITENTES" },
    { name: "luces_frenos_reversa", label: "4. FRENOS Y REVERSA" },
    { name: "luces_interiores", label: "5. INTERIORES" },
  ]},
  { title: "FUGAS Y NIVELES", items: [
    { name: "fugas_refrigerante", label: "6. REFRIGERANTE" },
    { name: "fugas_limpiaparabrisas", label: "7. LIMPIAPARABRISAS" },
    { name: "fugas_frenos_embrague", label: "8. FRENOS Y EMBRAGUE" },
    { name: "fugas_transmision", label: "9. TRANSMISIÓN Y TRANSEJE" },
    { name: "fugas_direccion_hidraulica", label: "10. DIRECCIÓN HIDRÁULICA" },
  ]},
  { title: "CARROCERÍA", items: [
    { name: "carroceria_cristales_espejos", label: "11. CRISTALES / ESPEJOS" },
    { name: "carroceria_puertas_cofre", label: "12. PUERTAS / COFRE / CAJUELA / SALPICADERA" },
    { name: "carroceria_asientos_tablero", label: "13. ASIENTOS / TABLERO / CONSOLA" },
    { name: "carroceria_plumas", label: "14. PLUMAS LIMPIAPARABRISAS" },
  ]},
  { title: "SUSPENSIÓN Y DIRECCIÓN", items: [
    { name: "suspension_rotulas", label: "15. RÓTULAS Y GUARDAPOLVOS" },
    { name: "suspension_amortiguadores", label: "16. AMORTIGUADORES" },
    { name: "suspension_caja_direccion", label: "17. CAJA DE DIRECCIÓN" },
    { name: "suspension_terminales", label: "18. TERMINALES DE DIRECCIÓN" },
  ]},
  { title: "LLANTAS (ESTADO Y PRESIÓN)", items: [
    { name: "llantas_delanteras_traseras", label: "19. DELANTERAS / TRASERAS" },
    { name: "llantas_refaccion", label: "20. REFACCIÓN" },
  ]},
  { title: "FRENOS", items: [
    { name: "frenos_discos_delanteros", label: "21. DISCOS / BALATAS DELANTERAS" },
    { name: "frenos_discos_traseros", label: "22. DISCOS / BALATAS TRASERAS" },
  ]},
  { title: "OTROS", items: [
    { name: "otros_tuberia_escape", label: "23. TUBERÍA DE ESCAPE" },
    { name: "otros_soportes_motor", label: "24. SOPORTES DE MOTOR" },
    { name: "otros_claxon", label: "25. CLAXON" },
    { name: "otros_inspeccion_sdb", label: "26. INSPECCIÓN DE SDB" },
  ]},
];

const StatusIndicator = ({ status }: { status?: SafetyCheckStatus }) => {
  const statusInfo = {
    ok: { label: "Bien", color: "bg-green-500", textColor: "text-green-700" },
    atencion: { label: "Atención", color: "bg-yellow-400", textColor: "text-yellow-700" },
    inmediata: { label: "Inmediata", color: "bg-red-500", textColor: "text-red-700" },
    na: { label: "N/A", color: "bg-gray-300", textColor: "text-gray-500" },
  };
  const currentStatus = statusInfo[status || 'na'] || statusInfo.na;

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${currentStatus.color}`} />
      <span className={cn("text-xs font-semibold", currentStatus.textColor)}>{currentStatus.label}</span>
    </div>
  );
};

const SafetyChecklistDisplay = ({
  inspection,
  workshopInfo,
  service,
  vehicle,
  onViewImage
}: {
  inspection: SafetyInspection;
  workshopInfo: WorkshopInfo;
  service: ServiceRecord;
  vehicle?: Vehicle;
  onViewImage: (url: string) => void;
}) => {
    const serviceDate = parseDate(service.serviceDate);
    const formattedServiceDate = serviceDate && isValid(serviceDate) ? format(serviceDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

    return (
        <div className="mt-4 print:mt-0">
            <header className="mb-4 pb-2 border-b-2 border-black">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="relative w-[150px] h-auto">
                        <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} width={150} height={50} style={{objectFit: 'contain'}} data-ai-hint="workshop logo" crossOrigin="anonymous" />
                    </div>
                    <div className="text-left sm:text-right">
                    <h1 className="text-base sm:text-lg font-bold">REVISIÓN DE PUNTOS DE SEGURIDAD</h1>
                    <p className="font-mono text-xs">Folio de Servicio: <span className="font-semibold">{service.id}</span></p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-xs">
                    <div>
                        <p className="font-bold">Placas:</p>
                        <p>{vehicle?.licensePlate}</p>
                        <p className="font-bold mt-2">Vehículo:</p>
                        <p>{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="font-bold">Fecha de Revisión:</p>
                        <p>{formattedServiceDate}</p>
                        {service.mileage && (
                            <>
                                <p className="font-bold mt-2">Kilometraje:</p>
                                <p>{service.mileage.toLocaleString('es-MX')} km</p>
                            </>
                        )}
                    </div>
                </div>
                 <div className="mt-2 text-xs border-t pt-2">
                    <p className="font-bold">Cliente:</p>
                    <p>{vehicle?.ownerName}{vehicle?.ownerPhone && ` - ${vehicle.ownerPhone}`}</p>
                </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {inspectionGroups.map(group => (
                    <div key={group.title} className="break-inside-avoid">
                        <h4 className="font-bold text-base mb-2 border-b-2 border-black pb-1">{group.title}</h4>
                        <div className="space-y-1">
                            {group.items.map(item => {
                                const checkItem = inspection[item.name as keyof Omit<SafetyInspection, 'inspectionNotes' | 'technicianSignature'>];
                                return (
                                    <div key={item.name} className="py-1 border-b border-dashed last:border-none">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="pr-4">{item.label}</span>
                                            <StatusIndicator status={checkItem?.status} />
                                        </div>
                                        {checkItem && checkItem.photos && checkItem.photos.length > 0 && (
                                            <div className="grid grid-cols-2 gap-1 mt-1 pl-4">
                                                {checkItem.photos.map((photoUrl, pIndex) => (
                                                     <button
                                                        type="button"
                                                        onClick={() => onViewImage && onViewImage(photoUrl)}
                                                        key={pIndex} 
                                                        className="relative aspect-video w-full bg-gray-100 rounded overflow-hidden border group"
                                                    >
                                                        <Image src={photoUrl} alt={`Evidencia para ${item.label}`} fill style={{objectFit: 'cover'}} className="transition-transform duration-300 group-hover:scale-105" crossOrigin="anonymous"/>
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Eye className="h-6 w-6 text-white" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            {inspection.inspectionNotes && (
                <div className="mt-6 border-t pt-4 break-before-page">
                    <h4 className="font-bold text-base mb-2">Observaciones Generales de la Inspección:</h4>
                    <p className="text-sm whitespace-pre-wrap p-2 bg-gray-50 rounded-md border">{inspection.inspectionNotes}</p>
                </div>
            )}
            {inspection.technicianSignature && (
                 <div className="mt-8 border-t pt-4 text-center flex flex-col items-center">
                    <div className="relative w-full h-full max-w-[200px] aspect-video">
                        <Image src={normalizeDataUrl(inspection.technicianSignature)} alt="Firma del técnico" fill className="object-contain" crossOrigin="anonymous"/>
                    </div>
                    <div className="mt-2 pt-1 w-64 text-center">
                        <p className="text-xs font-bold">FIRMA DEL TÉCNICO ({format(new Date(), "dd/MM/yyyy")})</p>
                    </div>
                </div>
            )}
        </div>
    )
}

interface ServiceSheetContentProps {
  service: ServiceRecord;
  vehicle?: Vehicle;
  workshopInfo?: WorkshopInfo;
  onViewImage?: (url: string) => void;
  isPublicView?: boolean;
  showSignReception?: boolean;
  showSignDelivery?: boolean;
  onSignClick?: (type: 'reception' | 'delivery') => void;
  isSigning?: boolean;
  activeTab: string;
}

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ service, vehicle, workshopInfo: workshopInfoProp, onViewImage, isPublicView, showSignReception, showSignDelivery, onSignClick, isSigning, activeTab }, ref) => {
    
    const effectiveWorkshopInfo = { ...initialWorkshopInfo, ...workshopInfoProp };
    
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
    
    const driver: Driver | undefined = vehicle?.isFleetVehicle 
        ? placeholderDrivers.find(d => d.assignedVehicleId === vehicle.id) 
        : undefined;

    const driverDebt = driver && vehicle ? calculateDriverDebt(driver, placeholderRentalPayments, [vehicle]) : { totalDebt: 0, rentalDebt: 0, depositDebt: 0, manualDebt: 0 };
    
    const shouldShowNextService = service.nextServiceInfo && service.status === 'Entregado';

    const ServiceOrderContent = (
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
                <Image src={effectiveWorkshopInfo.logoUrl} alt={`${effectiveWorkshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" crossOrigin="anonymous" />
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
           <section className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 text-xs">
              <div className="border-2 border-black rounded-md overflow-hidden flex-1">
                <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">DATOS DEL CLIENTE</h3>
                <div className="space-y-0.5 p-2 text-sm">
                  <p><span className="font-semibold">Nombre:</span> <span className="font-bold">{capitalizeWords(vehicle?.ownerName || '')}</span></p>
                  <p><span className="font-semibold">Teléfono:</span> <span className="font-bold">{vehicle?.ownerPhone || ''}</span></p>
                  {vehicle?.ownerEmail && <p><span className="font-semibold">Email:</span> <span className="font-bold">{vehicle.ownerEmail}</span></p>}
                </div>
              </div>
              <div className={cn("border-2 border-black rounded-md overflow-hidden flex-1", shouldShowNextService ? "md:col-span-1" : "md:col-span-2")}>
                  <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">DATOS DEL VEHÍCULO</h3>
                  <div className="space-y-0.5 p-2 text-sm">
                      <p><span className="font-semibold">Vehículo:</span> <span className="font-bold">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}</span></p>
                      <p><span className="font-semibold">Placas:</span> <span className="font-bold">{vehicle?.licensePlate || 'N/A'}</span></p>
                      {vehicle?.color && <p><span className="font-semibold">Color:</span> <span className="font-bold">{vehicle.color}</span></p>}
                      {service.mileage && <p><span className="font-semibold">Kilometraje:</span> <span className="font-bold">{service.mileage.toLocaleString('es-MX')} km</span></p>}
                  </div>
              </div>
              {shouldShowNextService && (
                  <div className="border-2 border-red-700 rounded-md overflow-hidden flex-1">
                    <h3 className="font-bold p-1 bg-red-700 text-white text-xs text-center">PRÓXIMO SERVICIO</h3>
                    <div className="p-2 space-y-1 text-center text-sm">
                        <p className="text-[10px] font-semibold">Lo que ocurra primero</p>
                        {service.nextServiceInfo!.date && isValid(parseDate(service.nextServiceInfo!.date)) && (
                            <p className="font-bold">Fecha: {format(parseDate(service.nextServiceInfo!.date)!, "dd/MMMM/yyyy", { locale: es })}</p>
                        )}
                        {service.nextServiceInfo!.mileage && (
                            <p className="font-bold">Kilometraje: {service.nextServiceInfo!.mileage.toLocaleString('es-MX')} km</p>
                        )}
                    </div>
                  </div>
              )}
          </section>
            
          {driverDebt.totalDebt > 0 && (
            <div className="my-2 p-2 border-2 border-red-500 bg-red-50 rounded-md text-red-800">
                <h4 className="font-bold text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4"/>AVISO DE ADEUDO</h4>
                <p className="text-xs mt-1">
                    Este conductor presenta un adeudo con la flotilla por <strong>{formatCurrency(driverDebt.totalDebt)}</strong>.
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
                  <h3 className="font-bold p-1 bg-gray-700 text-white text-center text-xs">COMBUSTIBLE</h3>
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
                                <Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma de recepción" fill style={{objectFit: 'contain'}} unoptimized crossOrigin="anonymous" />
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
                            <Image src={normalizeDataUrl(service.customerSignatureDelivery)} alt="Firma de conformidad" fill style={{objectFit: 'contain'}} unoptimized crossOrigin="anonymous"/>
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
                        <p className="text-[7px] text-gray-600">Recibo de conformidad. El servicio realizado cuenta con una garantía de 90 días o 1,000 km, lo que ocurra primero.</p>
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
    );

    const PhotoReportContent = (
      <div className="mt-4 print:mt-0">
        <header className="mb-4 pb-2 border-b-2 border-black">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold">REPORTE FOTOGRÁFICO</h1>
            <p className="font-mono text-xs">
              Folio de Servicio:{" "}
              <span className="font-semibold">{service.id}</span>
            </p>
          </div>
        </header>
        <div className="space-y-4">
          {service.photoReports!.map((reportItem) => (
            <div key={reportItem.id} className="break-inside-avoid border-b pb-4 last:border-none">
                <p className="mb-2 text-sm">
                    <span className="font-bold">Fecha:</span>{" "}
                    {format(parseISO(reportItem.date), "dd/MM/yyyy HH:mm", { locale: es })}
                    <br />
                    <span className="font-bold">Descripción:</span>{" "}
                    {reportItem.description}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                {reportItem.photos.map((photoUrl, photoIndex) => (
                    <button
                        type="button"
                        onClick={() => onViewImage && onViewImage(photoUrl)}
                        key={photoIndex} 
                        className="relative aspect-video w-full bg-gray-100 rounded overflow-hidden border group"
                    >
                        <Image
                            src={photoUrl}
                            alt={`Foto ${photoIndex + 1}`}
                            fill
                            style={{objectFit: 'cover'}}
                            className="transition-transform duration-300 group-hover:scale-105"
                            data-ai-hint="car damage photo"
                            crossOrigin="anonymous"
                        />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <Eye className="h-8 w-8 text-white" />
                        </div>
                    </button>
                ))}
                </div>
            </div>
          ))}
        </div>
      </div>
    );

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'quote':
                return service.status === 'Cotizacion' || service.status === 'Agendado'
                  ? <QuoteContent quote={service} vehicle={vehicle} workshopInfo={effectiveWorkshopInfo} />
                  : null;
            case 'order':
                return ServiceOrderContent;
            case 'checklist':
                return service.safetyInspection
                  ? <SafetyChecklistDisplay inspection={service.safetyInspection} workshopInfo={effectiveWorkshopInfo} service={service} vehicle={vehicle} onViewImage={onViewImage || (() => {})} />
                  : null;
            case 'photoreport':
                return service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0)
                  ? PhotoReportContent
                  : null;
            default:
                return ServiceOrderContent;
        }
    };
    
    return (
      <div ref={ref} data-format="letter" className="font-sans bg-white text-black text-sm h-full w-full">
        {renderActiveTabContent()}
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
