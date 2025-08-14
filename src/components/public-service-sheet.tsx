

"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, CalendarCheck, CheckCircle, XCircle, Clock, Ellipsis, Eye, Signature, Loader2, AlertCircle, CalendarDays, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


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
                        <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} width={150} height={50} style={{objectFit: 'contain'}} data-ai-hint="workshop logo" crossOrigin="anonymous" priority />
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
                        <Image src={normalizeDataUrl(inspection.technicianSignature)} alt="Firma del técnico" fill className="object-contain" crossOrigin="anonymous" priority />
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
  record: any;
  onSignClick?: (type: 'reception' | 'delivery') => void;
  onScheduleClick?: () => void;
  onConfirmClick?: () => void;
  isSigning?: boolean;
  isConfirming?: boolean;
  activeTab: string;
}

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ record, onSignClick, onScheduleClick, onConfirmClick, isSigning, isConfirming, activeTab }, ref) => {
    
    const isQuoteOrScheduled = record.status === 'Cotizacion' || record.status === 'Agendado';

    if (isQuoteOrScheduled) {
      return <QuoteContent ref={ref} quote={record} onScheduleClick={onScheduleClick} onConfirmClick={onConfirmClick} isConfirming={isConfirming} />;
    }
    
    const service: ServiceRecord = record;
    const vehicle = record.vehicle as Vehicle | null;
    const workshopInfo = record.workshopInfo || initialWorkshopInfo;

    const receptionDate = parseDate(service.receptionDateTime) || parseDate(service.serviceDate);
    const formattedReceptionDate = receptionDate && isValid(receptionDate) ? format(receptionDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    const IVA_RATE = 0.16;

    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = (service.serviceItems ?? []).reduce((acc, it) => acc + (Number(it.price) || 0), 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [service.serviceItems]);
    
    const termsText = `Precios en MXN. No incluye trabajos o materiales no especificados. Esta orden de servicio está sujeta a los Términos y Condiciones disponibles en nuestro taller o en nuestro sitio web.`;

    const customerName = capitalizeWords(service.customerName || vehicle?.ownerName || '');
    const customerPhone = vehicle?.ownerPhone || 'Teléfono no disponible';
    const vehicleMake = vehicle?.make || '';
    const vehicleModel = vehicle?.model || '';
    const vehicleYear = vehicle?.year || 'N/A';
    const vehicleLicensePlate = vehicle?.licensePlate || service.vehicleIdentifier || 'N/A';
    const vehicleColor = vehicle?.color;
    const serviceMileage = service?.mileage;

    const ServiceOrderContent = (
      <div className="flex flex-col min-h-full relative print:p-0">
        <header className="mb-2 pb-2 border-b-2 border-black">
          <div className="flex justify-between items-start gap-2">
            <div className="relative w-[150px] h-[50px]">
                <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" crossOrigin="anonymous" priority />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold">ORDEN DE SERVICIO</h1>
              <p className="font-mono text-base">Folio: <span className="font-bold">{service.id}</span></p>
            </div>
          </div>
          <div className="flex justify-between items-end mt-1 text-xs">
             <div className="space-y-0 leading-tight">
                <p className="font-bold text-base">{workshopInfo.name}</p>
                <p>{workshopInfo.addressLine1}</p>
                {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
                <p>{workshopInfo.cityState}</p>
                <p>Tel: {workshopInfo.phone}</p>
             </div>
             <div className="text-right text-[10px]">
                <p><span className="font-bold">Fecha de Recepción:</span> {formattedReceptionDate}</p>
             </div>
          </div>
        </header>

        <main className="flex-grow">
           <section className="mb-4 text-sm border-b-2 border-black pb-2">
            <p className="font-bold text-lg">{customerName}</p>
            <p className="font-semibold text-base">{customerPhone}</p>
            <div className="mt-2 flex justify-between items-end">
                <p className="font-bold text-lg">{vehicle ? `${vehicleMake} ${vehicleModel} ${vehicleYear}` : 'N/A'}</p>
                <p className="font-bold text-xl px-2 py-1 bg-gray-200 rounded-md">{vehicleLicensePlate}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader><CardTitle>Trabajos a Realizar</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(service.serviceItems || []).map((item, index) => (
                                <div key={item.id || index} className="p-4 rounded-lg bg-background">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-semibold">{item.name}</p>
                                            {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <p className="font-bold text-lg">{formatCurrency(item.price)}</p>
                                    </div>
                                </div>
                            ))}
                            {(!service.serviceItems || service.serviceItems.length === 0) && (
                                <p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">{termsText}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-base">Resumen de Costos</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subTotal)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">IVA (16%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div>
                        <Separator className="my-2"/>
                        <div className="flex justify-between items-center font-bold text-base"><span>Total a Pagar:</span><span className="text-primary">{formatCurrency(totalCost)}</span></div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </main>
        
        <footer className="mt-auto pt-2 text-xs">
           <section className="mt-2 text-center text-gray-500 text-[10px] space-x-4">
              <Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link>
              <span>|</span>
              <Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link>
           </section>
           {workshopInfo.fixedFooterText && (
            <div className="text-center mt-2 pt-2 border-t border-gray-200">
              <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">{workshopInfo.fixedFooterText}</p>
            </div>
          )}
        </footer>
      </div>
    );

    return (
        <div ref={ref} data-format="letter" className="font-sans bg-white text-black text-sm h-full w-full">
            {ServiceOrderContent}
        </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
