

"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency } from "@/lib/utils";
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Eye, Signature, Loader2, AlertCircle } from 'lucide-react';
import { QuoteContent } from '@/components/quote-content';
import { Button } from '@/components/ui/button';
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
  fixedFooterText: "© 2025 Ranoro®\nSistema de Administracion de Talleres\nTodos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
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
                    <img src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} style={{ width: '150px', height: 'auto' }} data-ai-hint="workshop logo" />
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
                                                        <Image src={photoUrl} alt={`Evidencia para ${item.label}`} layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover:scale-105"/>
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
                    <div className="h-24 w-full max-w-[200px] relative">
                        <Image src={normalizeDataUrl(inspection.technicianSignature)} alt="Firma del técnico" width={200} height={96} style={{ objectFit: 'contain' }} unoptimized/>
                    </div>
                    <div className="border-t-2 border-black mt-2 pt-1 w-64 text-center">
                        <p className="text-xs font-bold">FIRMA DEL TÉCNICO</p>
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
    
    const serviceDate = parseDate(service.serviceDate);
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
    
    const ServiceOrderContent = (
      <div className="flex flex-col min-h-[10in]">
        <header className="mb-4 pb-2 border-b-2 border-black">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <Image src={effectiveWorkshopInfo.logoUrl} alt={`${effectiveWorkshopInfo.name} Logo`} width={150} height={40} style={{ width: '150px', height: 'auto' }} data-ai-hint="workshop logo" />
            <div className="text-left sm:text-right">
              <h1 className="text-lg sm:text-xl font-bold">ORDEN DE SERVICIO</h1>
              <p className="font-mono text-sm sm:text-base">Folio: <span className="font-bold">{service.id}</span></p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-2 text-xs">
             <div className="space-y-0.5 leading-tight">
                <p className="font-bold text-sm sm:text-base">{effectiveWorkshopInfo.name}</p>
                <p>{effectiveWorkshopInfo.addressLine1}</p>
                {effectiveWorkshopInfo.addressLine2 && <p>{effectiveWorkshopInfo.addressLine2}</p>}
                <p>{effectiveWorkshopInfo.cityState}</p>
                <p>Tel: {effectiveWorkshopInfo.phone}</p>
             </div>
             <div className="text-left sm:text-right text-[10px] mt-2 sm:mt-0">
                <p><span className="font-bold">Fecha de Recepción:</span> {formattedServiceDate}</p>
             </div>
          </div>
        </header>

        <main className="flex-grow">
           <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
                <div className="border-2 border-black rounded-md overflow-hidden md:col-span-1">
                    <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">DATOS DEL CLIENTE</h3>
                    <div className="space-y-0.5 p-2">
                        <p><span className="font-semibold">Nombre:</span> <span className="font-bold">{vehicle?.ownerName || ''}</span></p>
                        <p><span className="font-semibold">Teléfono:</span> <span className="font-bold">{vehicle?.ownerPhone || ''}</span></p>
                        {vehicle?.ownerEmail && <p><span className="font-semibold">Email:</span> <span className="font-bold">{vehicle.ownerEmail}</span></p>}
                    </div>
                </div>
                <div className={cn("md:col-span-2 grid grid-cols-1 gap-4", service.nextServiceInfo && "md:grid-cols-2")}>
                    <div className="border-2 border-black rounded-md overflow-hidden">
                        <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">DATOS DEL VEHÍCULO</h3>
                        <div className="space-y-0.5 p-2">
                            <p><span className="font-semibold">Vehículo:</span> <span className="font-bold">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}</span></p>
                            <p><span className="font-semibold">Placas:</span> <span className="font-bold">{vehicle?.licensePlate}</span></p>
                            {vehicle?.color && <p><span className="font-semibold">Color:</span> <span className="font-bold">{vehicle.color}</span></p>}
                            {service.mileage && <p><span className="font-semibold">Kilometraje:</span> <span className="font-bold">{service.mileage.toLocaleString('es-MX')} km</span></p>}
                        </div>
                    </div>
                    {service.nextServiceInfo && (
                        <div className="border-2 border-red-700 rounded-md overflow-hidden">
                            <h3 className="font-bold p-1 bg-red-700 text-white text-xs text-center">PRÓXIMO SERVICIO</h3>
                            <div className="p-2 space-y-1 text-center">
                                <p className="text-[10px] font-semibold">Lo que ocurra primero</p>
                                <p className="font-bold">Fecha: {format(parseISO(service.nextServiceInfo.date), "dd/MMMM/yyyy", { locale: es })}</p>
                                {service.nextServiceInfo.mileage && typeof service.nextServiceInfo.mileage === 'number' && isFinite(service.nextServiceInfo.mileage) && (
                                    <p className="font-bold">Kilometraje: {service.nextServiceInfo.mileage.toLocaleString('es-MX')} km</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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


          <section className="border-2 border-black rounded-md overflow-hidden mb-4">
              <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">TRABAJOS A REALIZAR</h3>
              <div className="p-2 space-y-2 text-xs">
                {service.serviceItems && service.serviceItems.length > 0 ? (
                  service.serviceItems.map((item, index) => {
                      const isLastItem = index === service.serviceItems.length - 1;
                      return (
                          <div key={index} className={cn("pb-2", !isLastItem && "border-b border-dashed border-gray-300")}>
                              <div className="flex justify-between items-center font-bold text-sm sm:text-base">
                                  <p>{item.name}</p>
                                  <p>{formatCurrency(item.price)}</p>
                              </div>
                              {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                  <ul className="list-disc list-inside pl-2 text-gray-600 mt-1">
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
          
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
              <div className="border-2 border-black rounded-md overflow-hidden col-span-1 md:col-span-2">
                 <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">CONDICIONES DEL VEHÍCULO (AL INGRESAR AL TALLER)</h3>
                 <p className="whitespace-pre-wrap p-2 min-h-[20px] text-sm sm:text-base">{service.vehicleConditions || 'No especificado.'}</p>
              </div>
              <div className="border-2 border-black rounded-md overflow-hidden col-span-1 flex flex-col justify-center min-h-[60px]">
                  <h3 className="font-bold p-1 bg-gray-700 text-white text-center text-xs">NIVEL DE COMBUSTIBLE</h3>
                  <div className="flex-grow flex flex-col items-center justify-center p-2">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                        <div className={cn("h-full transition-all", fuelColor)} style={{ width: `${fuelPercentage}%` }} />
                    </div>
                    <div className="w-full flex justify-between text-[8px] mt-0.5 px-0.5">
                        <span>E</span>
                        <span>F</span>
                    </div>
                    <span className="font-semibold text-sm mt-1">{service.fuelLevel || 'N/A'}</span>
                  </div>
              </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
            <div className="border-2 border-black rounded-md overflow-hidden">
                <h3 className="font-bold p-1 bg-gray-700 text-white text-xs text-center">INVENTARIO DE PERTENENCIAS</h3>
                <p className="whitespace-pre-wrap p-2 min-h-[104px] text-sm sm:text-base">{service.customerItems || 'No especificado.'}</p>
            </div>
            {service.serviceType !== 'Cambio de Aceite' && (
              <div className="border-2 border-black p-2 rounded-md flex flex-col justify-between items-center min-h-[130px]">
                  <h3 className="font-bold uppercase text-center text-sm">AUTORIZO QUE SE REALICEN ESTOS SERVICIOS</h3>
                  {service.customerSignatureReception ? (
                      <div className="w-full h-full flex items-center justify-center">
                          <Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma del cliente" width={200} height={100} style={{objectFit: 'contain'}} unoptimized />
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-end flex-grow w-full">
                        {isPublicView && showSignReception && onSignClick && (
                            <Button onClick={() => onSignClick('reception')} disabled={isSigning} className="mb-2">
                            {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                            Firmar Aquí
                            </Button>
                        )}
                        <div className="border-t-2 border-black mt-auto pt-1 text-center w-full">
                            <p className="text-xs font-semibold">{vehicle?.ownerName || '________________________________'}</p>
                        </div>
                    </div>
                  )}
              </div>
            )}
          </section>
        </main>
        
        <footer className="mt-auto pt-4 text-xs">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center mb-4">
               <div className="pt-2 flex flex-col justify-end">
                    <div className="min-h-[28px] flex-grow flex items-center justify-center">
                        {service.serviceAdvisorSignatureDataUrl && (
                            <div className="relative w-full h-full max-w-[100px]">
                                <Image src={normalizeDataUrl(service.serviceAdvisorSignatureDataUrl)} alt="Firma del asesor" width={100} height={28} style={{ objectFit: 'contain' }} unoptimized/>
                            </div>
                        )}
                    </div>
                    <div className="border-t-2 border-black pt-1 w-full text-center">
                        <p className="font-bold">ASESOR DE SERVICIO: {service.serviceAdvisorName?.toUpperCase() || '________________________________'}</p>
                    </div>
                </div>
                <div className="min-h-[65px] flex flex-col justify-end">
                   <div className="h-full flex-grow flex flex-col items-center justify-center">
                       {service.customerSignatureDelivery ? (
                         <div className="relative w-24 h-12">
                           <Image src={normalizeDataUrl(service.customerSignatureDelivery)} alt="Firma de conformidad" width={96} height={48} style={{ objectFit: 'contain' }} unoptimized/>
                         </div>
                       ) : (
                         isPublicView && showSignDelivery && onSignClick && (
                            <Button onClick={() => onSignClick('delivery')} disabled={isSigning} className="mb-2 bg-green-600 hover:bg-green-700">
                                {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                                Firmar de Conformidad
                            </Button>
                         )
                       )}
                   </div>
                   <div className="border-t-2 border-black pt-1 w-full text-center mt-auto">
                       <p className="font-bold">RECIBO DE CONFORMIDAD: {vehicle?.ownerName || '________________________________'}</p>
                   </div>
               </div>
           </div>
           <section>
                <p className="text-[7px] text-justify leading-tight">
                    <span className="font-bold">TERMINOS Y CONDICIONES:</span> 1. En virtud de este contrato, Servicio Ranoro presta el servicio de reparación y/o mantenimiento al Cliente (Consumidor), del vehículo cuyas características se detallan en este contrato. 2. El Cliente expresa ser el dueño del vehículo y/o estar facultado para autorizar la reparación y/o mantenimiento del vehículo descrito en el presente contrato, por lo que acepta las condiciones y términos bajo los cuales se realizará la prestación del servicio descrita en dicho contrato. Asimismo, es sabedor de las posibles consecuencias que puede sufrir el vehículo con motivo de su reparación y/o mantenimiento y se responsabiliza de las mismas. 3. El consumidor acepta haber tenido a la vista los precios por mano de obra, partes y/o refacciones a emplear en las operaciones a efectuar por parte de Ranoro, y cuyas refacciones son nuevas y apropiadas para el funcionamiento del vehiculo. 4. Las condiciones generales del vehículo materia de reparación y/o mantenimiento, son señalados en el carátula del presente contrato. 5. Se otorga con garantía por un plazo de 90 días en mano de obra contados a partir de la entrega del vehículo. Para la garantía en partes, piezas, refacciones y accesorios, Ranoro transmitirá la otorgada por el fabricante y/o proveedor. la garantía deberá hacerse válida en las instalaciones de RANORO siempre y cuando no se haya efectuado una reparación por un tercero. El tiempo que dure la reparación y/o mantenimiento del vehículo, bajo la protección de la garantía, no es computable dentro del plazo de la misma. De igual forma, los gastos en que incurra el Cliente para hacer válida la garantía en un domicilio diverso al de Ranoro, deberán ser cubiertos por éste. 6. Ranoro será el responsable por las descomposturas, daños o pérdidas parciales o totales imputables a él mientras el vehículo se encuentre bajo su resguardo para llevar a cabo la prestación del servicio de reparación y/o mantenimiento, o como consecuencia de la prestación del servicio, o bien, en el cumplimiento de la garantía, de acuerdo a lo establecido en el presente contrato. Asimismo, el Cliente autoriza a Ranoro a usar el vehículo para efectos de prueba o verificación de las operaciones a realizar o realizadas. El Cliente libera a Ranoro de cualquier responsabilidad que hubiere surgido o pudiera surgir con relación al origen, propiedad o posesión del vehículo. 7. En caso de que el consumidor cancele la operación, está obligado a pagar de manera inmediata y previa a la entrega del vehículo, el importe de las operaciones efectuadas y partes y/o refacciones colocadas o adquiridas hasta el retiro del mismo. 8. El Consumidor deberá recoger el vehículo, no mas de 24 horas posteriores de haberse notificado, ya sea por teléfono, mensaje o aplicación móvil que el vehículo se encuentra listo, en caso contrario, se obliga a pagar a Ranoro, la cantidad de $300.00 (Trescientos pesos 00/100 M.N.) por concepto de almacenaje del vehículo por cada día que transcurra. Transcurrido un plazo de 15 días naturales a partir de la fecha señalada para la entrega del vehículo, y el Cliente no acuda a recoger el mismo, Ranoro sin responsabilidad alguna, pondrá a disposición de la autoridad correspondiente dicho vehículo. Sin perjuicio de lo anterior, Ranoro podrá realizar el cobro correspondiente por concepto de almacenaje. 9. Ranoro se obliga a expedir la factura o comprobante de pago por las operacionès efectuadas, en la cual se especificarán los precios por mano de obra, refacciones, materiales y accesorios empleados, asi como la garantía que en su caso se otorgue, conforme al artículo 62 de la Ley Federal de Protección al Consumidor.10. Ranoro se obliga a no ceder o transmitir a terceros, con fines mercadotécnicos o publicitarios, los datos e información proporcionada por el consumidor con motivo del presente contrato. 11. Las partes están de acuerdo en someterse a la competencia de la Procuraduría Federal del Consumidor en la vía administrativa para resolver cualquier controversia que se suscite sobre la interpretación o cumplimiento de los términos y condiciones del presente contrato y de las disposiciones de la Ley Federal de Protección al Consumidor, la Norma Oficial Mexicana NOM-17li-SCFI-2007, Prácticas comerciales-Elementos de información para la prestación de servicios en general y cualquier otra disposición aplicable, sin perjuicio del derecho que tienen las partes de someterse a la jurisdicción de los Tribunales competentes del estado de Aguascalientes, renunciando las partes expresamente a cualquier otra jurisdicción que pudiera corresponderles por razón de sus domicilios futuros. 12. El Cliente y Ranoro aceptan la realización de la prestación del servicio de reparación y/o mantenimiento, en los términos establecidos en este contrato, y sabedores de su alcance legal lo firman por duplicado.13. El Cliente y Ranoro aceptan la utilización de aplicaciones móviles (iOS-ANDROID) para enviar, recibir y en su caso aceptar información de trabajos adicionales que se han de realizar a los originalmente contratados por el Consumidor, así como autorizar los mismos por los medios tecnológicos con que se cuente.
                </p>
           </section>
           {effectiveWorkshopInfo.fixedFooterText && (
            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{effectiveWorkshopInfo.fixedFooterText}</p>
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
                            layout="fill"
                            objectFit="cover"
                            className="transition-transform duration-300 group-hover:scale-105"
                            data-ai-hint="car damage photo"
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
      <div ref={ref} data-format="letter" className="font-sans bg-white text-black text-sm">
        {renderActiveTabContent()}
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
