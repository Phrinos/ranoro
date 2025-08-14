
"use client";

import type { QuoteRecord, WorkshopInfo, Vehicle, ServiceRecord } from '@/types';
import { format, isValid, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import { cn, formatCurrency, capitalizeWords, formatNumber, normalizeDataUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, CalendarCheck, CheckCircle, Ban, Clock, Eye, Signature, Loader2, AlertCircle, CalendarDays, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cancelAppointmentAction } from '@/app/(public)/s/actions';
import { useToast } from '@/hooks/use-toast';
import { parseDate } from '@/lib/forms';
import { GARANTIA_CONDICIONES_TEXT } from '@/lib/constants/legal-text';
import { placeholderDrivers, placeholderRentalPayments } from '@/lib/placeholder-data';
import { calculateDriverDebt } from '@/lib/utils';


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

function coerceDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isValid(v) ? v : null;
  if (typeof (v as any)?.toDate === 'function') {
    const d = (v as any).toDate();
    return isValid(d) ? d : null;
  }
  if (typeof v === 'number') {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isValid(d) ? d : null;
  }
  if (typeof v === 'string') {
    const isoTry = parseISO(v);
    if (isValid(isoTry)) return isoTry;
    const generic = new Date(v);
    if (isValid(generic)) return generic;
  }
  return null;
}

interface ServiceSheetContentProps {
  service: ServiceRecord;
  onScheduleClick?: () => void;
  onConfirmClick?: () => void;
  isConfirming?: boolean;
  onSignClick?: (type: 'reception' | 'delivery') => void;
  isSigning?: boolean;
  activeTab: string;
}

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ service, onScheduleClick, onConfirmClick, isConfirming, onSignClick, isSigning }, ref) => {
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);
    const vehicle = service.vehicle as Vehicle | undefined;
    const workshopInfo = service.workshopInfo || initialWorkshopInfo;
    const IVA_RATE = 0.16;

    const isQuoteOrScheduled = service.status === 'Cotizacion' || service.status === 'Agendado';

    // Logic for 'Cotizacion' and 'Agendado' states
    const quoteDate = coerceDate((service as any).serviceDate) || new Date();
    const formattedQuoteDate = isValid(quoteDate) ? format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const appointmentDate = coerceDate((service as any).appointmentDateTime);
    const formattedAppointmentDate = appointmentDate
      ? format(appointmentDate, "EEEE dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'", { locale: es })
      : 'Fecha y hora por confirmar';
    
    const items = useMemo(() => (service?.serviceItems ?? []).map(it => ({
        ...it,
        price: Number(it?.price) || 0,
    })), [service?.serviceItems]);

    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = items.reduce((acc, it) => acc + it.price, 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);
    
    const termsText = `Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Esta cotización tiene una vigencia de 15 días a partir de su fecha de emisión. Los precios de las refacciones están sujetos a cambios sin previo aviso por parte de los proveedores.`;

    const status = (service.status || '').toLowerCase();
    const appointmentStatus = service.appointmentStatus;

    const isQuoteStatus = status === 'cotizacion';
    const isAppointmentConfirmed = status === 'agendado' && appointmentStatus === 'Confirmada';
    const isAppointmentPending = status === 'agendado' && appointmentStatus === 'Sin Confirmar';
    const isAppointmentCancelled = status === 'agendado' && appointmentStatus === 'Cancelada';

    // Logic for 'En Taller' and 'Entregado' states
    const receptionDate = parseDate(service.receptionDateTime) || parseDate(service.serviceDate);
    const formattedReceptionDate = receptionDate && isValid(receptionDate) ? format(receptionDate, "dd 'de' MMMM 'de' yyyy, HH:mm 'hrs'", { locale: es }) : 'N/A';

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
    const customerName = capitalizeWords(service.customerName || vehicle?.ownerName || '');
    const customerPhone = vehicle?.ownerPhone || 'Teléfono no disponible';
    const vehicleMake = vehicle?.make || '';
    const vehicleModel = vehicle?.model || '';
    const vehicleYear = vehicle?.year || 'N/A';
    const vehicleLicensePlate = vehicle?.licensePlate || service.vehicleIdentifier || 'N/A';

    const handleCancelAppointment = async () => {
      setIsCancelling(true);
      try {
        const result = await cancelAppointmentAction(service.id);
        if (result.success) {
          toast({ title: "Cita Cancelada", description: "Tu cita ha sido cancelada exitosamente." });
        } else {
          throw new Error(result.error);
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "No se pudo cancelar la cita.", variant: "destructive" });
      } finally {
        setIsCancelling(false);
      }
    };
    
    // Conditional Rendering Logic
    if (isQuoteOrScheduled) {
      // RENDER QUOTE/SCHEDULED VIEW
      const getStatusCardContent = () => {
        if (isAppointmentCancelled) return { className: "bg-red-100 border-red-200 dark:bg-red-900/50 dark:border-red-800", title: "CITA CANCELADA", titleClassName: "text-red-900 dark:text-red-200", description: "Esta cita ha sido cancelada.", descriptionClassName: "text-red-800 dark:text-red-300" };
        if (isAppointmentConfirmed || isAppointmentPending) return { className: "bg-blue-50 border-blue-200 dark:bg-blue-900/50 dark:border-blue-800", title: isAppointmentConfirmed ? "CITA AGENDADA" : "CITA PENDIENTE DE CONFIRMACIÓN", titleClassName: "text-blue-900 dark:text-blue-200", description: formattedAppointmentDate, descriptionClassName: "text-blue-800 dark:text-blue-300" };
        return { className: "bg-amber-100 border-amber-200 dark:bg-amber-900/50 dark:border-amber-800", title: "COTIZACIÓN DE SERVICIO", titleClassName: "text-amber-900 dark:text-amber-200", description: null, descriptionClassName: "" };
      };
      const statusCard = getStatusCardContent();

      return (
        <div ref={ref} className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
                    <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" sizes="150px" />
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-lg">Folio: {service.id}</p>
                  <p className="text-sm text-muted-foreground">{formattedQuoteDate}</p>
                </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><User className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Cliente</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{customerName}</p><p className="text-sm text-muted-foreground">{customerPhone}</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Vehículo</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{vehicleMake} {vehicleModel} ({vehicleYear})</p><p className="text-muted-foreground">{vehicleLicensePlate}</p>{vehicle?.color && <p className="text-xs text-muted-foreground">Color: {vehicle.color}</p>}{service.mileage && <p className="text-xs text-muted-foreground">KM: {formatNumber(service.mileage)}</p>}</CardContent></Card>
          </div>
          
          <Card className={cn(statusCard.className)}>
            <CardHeader className="p-4 text-center">
                <div className="space-y-1">
                    <CardTitle className={cn("text-lg font-bold tracking-wider", statusCard.titleClassName)}>{statusCard.title}</CardTitle>
                    {statusCard.description && <p className={cn("font-semibold", statusCard.descriptionClassName)}>{statusCard.description}</p>}
                </div>
                {isAppointmentConfirmed && <Badge className="mt-2 bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3"/>Confirmada</Badge>}
            </CardHeader>
          </Card>
          
          {isQuoteStatus && onScheduleClick && <div className="text-center"><Button onClick={onScheduleClick} size="lg"><CalendarDays className="mr-2 h-5 w-5"/>Agendar Cita</Button></div>}
          {isAppointmentPending && onConfirmClick && (
            <div className="flex justify-center items-center gap-4 flex-wrap">
              <ConfirmDialog triggerButton={<Button variant="destructive" disabled={isCancelling}><Ban className="mr-2 h-4 w-4"/>Cancelar Cita</Button>} title="¿Estás seguro de cancelar esta cita?" description="Esta acción notificará al taller sobre la cancelación. Puedes volver a agendar más tarde." onConfirm={handleCancelAppointment} isLoading={isCancelling}/>
              <Button onClick={onConfirmClick} size="lg" disabled={isConfirming} className="bg-green-600 hover:bg-green-700">{isConfirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}{isConfirming ? 'Confirmando...' : 'Confirmar mi Cita'}</Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2"><Card><CardHeader><CardTitle>Trabajos a realizar</CardTitle></CardHeader><CardContent><div className="space-y-4">{items.map((item, index) => (<div key={item.id || index} className="p-4 rounded-lg bg-background"><div className="flex justify-between items-start"><div className="flex-1"><p className="font-semibold">{item.name}</p>{item.suppliesUsed && item.suppliesUsed.length > 0 && (<p className="text-xs text-muted-foreground mt-1">Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}</p>)}</div><p className="font-bold text-lg">{formatCurrency(item.price)}</p></div></div>))}{items.length === 0 && (<p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>)}</div><p className="text-xs text-muted-foreground mt-4 pt-4 border-t">{termsText}</p></CardContent></Card></div>
            <div className="lg:col-span-1 space-y-6"><Card><CardHeader><CardTitle className="text-base">Resumen de Costos</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subTotal)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">IVA (16%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div><Separator className="my-2"/><div className="flex justify-between items-center font-bold text-base"><span>Total a Pagar:</span><span className="text-primary">{formatCurrency(totalCost)}</span></div><div className="text-center text-sm font-semibold mt-4 pt-4 border-t"><p>Cotización Válida hasta el {validityDate}.</p></div></CardContent></Card></div>
          </div>
          
          <Card><CardContent className="p-6 flex flex-col md:flex-row items-center gap-6"><div className="flex flex-col items-center flex-shrink-0"><div className="p-2 bg-white flex items-center justify-center w-48 h-24 border rounded-md">{service.serviceAdvisorSignatureDataUrl ? (<img src={service.serviceAdvisorSignatureDataUrl} alt="Firma del asesor" className="mx-auto object-contain max-h-full max-w-full" />) : <p className="text-xs text-muted-foreground">Firma no disponible</p>}</div><p className="font-semibold text-sm mt-2">{service.serviceAdvisorName || 'Asesor no asignado'}</p><p className="text-xs text-muted-foreground">Asesor de Servicio</p></div><div className="text-center md:text-left flex-grow"><h3 className="text-lg font-bold">¡Gracias por su preferencia!</h3><p className="text-muted-foreground mt-1">Para dudas o aclaraciones, no dude en contactarnos.</p><a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><Badge className="mt-4 bg-green-100 text-green-800 text-base py-2 px-4 hover:bg-green-200"><Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2"/> {workshopInfo.phone}</Badge></a></div></CardContent><CardContent className="p-4 border-t"><div className="flex flex-col md:flex-row justify-between items-center gap-4"><div className="flex justify-center md:justify-start items-center gap-4"><a href={workshopInfo.googleMapsUrl || "https://www.ranoro.mx"} target="_blank" rel="noopener noreferrer" title="Sitio Web"><Icon icon="mdi:web" className="h-6 w-6 text-muted-foreground hover:text-primary"/></a><a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"><Icon icon="logos:whatsapp-icon" className="h-6 w-6"/></a><a href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Facebook"><Icon icon="logos:facebook" className="h-6 w-6"/></a><a href="https://www.instagram.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Instagram"><Icon icon="skill-icons:instagram" className="h-6 w-6"/></a></div><div className="text-xs text-muted-foreground text-center md:text-right space-x-2"><Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link><span>|</span><Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link></div></div></CardContent></Card>
        </div>
      );
    } else {
      // RENDER IN-PROGRESS/COMPLETED VIEW
      return (
        <div ref={ref} data-format="letter" className="font-sans bg-white text-black text-sm h-full w-full">
            <div className="flex flex-col min-h-full relative print:p-0">
                {service.status === 'Cancelado' && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-red-500 text-7xl md:text-9xl font-black opacity-20 transform -rotate-12 select-none">CANCELADO</span>
                  </div>
                )}
                <header className="mb-2 pb-2 border-b-2 border-black">
                  <div className="flex justify-between items-start gap-2">
                    <div className="relative w-[150px] h-[50px]">
                        <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" crossOrigin="anonymous" priority sizes="150px"/>
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
                  
                  {/* ... Rest of the component for 'En Taller' / 'Entregado' */}
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
                        ) : (<p className="text-gray-600 italic">No se especificaron trabajos.</p>)}
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
                            <div className="w-full flex justify-between text-base mt-0.5 px-0.5"><span>E</span><span>F</span></div>
                            <span className="font-semibold text-sm mt-1">{service.fuelLevel || 'N/A'}</span>
                          </div>
                      </div>
                  </section>
                   <section className="mt-auto pt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="border-2 border-black rounded-md overflow-hidden flex flex-col justify-between items-center p-1 min-h-[180px] col-span-1">
                            <h3 className="font-bold p-1 w-full bg-gray-700 text-white text-xs text-center rounded-sm">ASESOR</h3>
                            <div className="flex-grow flex items-center justify-center w-full min-h-[50px]">
                                {service.serviceAdvisorSignatureDataUrl && (<div className="relative w-full h-full"><Image src={normalizeDataUrl(service.serviceAdvisorSignatureDataUrl)} alt="Firma del asesor" fill style={{objectFit: 'contain'}} crossOrigin="anonymous" priority sizes="200px"/></div>)}
                            </div>
                            <div className="w-full text-center mt-auto pt-1 leading-tight"><p className="font-bold text-sm leading-tight">{capitalizeWords(service.serviceAdvisorName || '')}</p></div>
                        </div>
                        <div className="border-2 border-black rounded-md overflow-hidden flex flex-col justify-between items-center p-1 min-h-[180px]">
                            <h3 className="font-bold p-1 w-full bg-gray-700 text-white text-xs text-center rounded-sm">ENTRADA AL TALLER</h3>
                            <div className="flex-grow flex items-center justify-center w-full min-h-[50px]">
                                {service.customerSignatureReception ? (<div className="relative w-full h-full"><Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma de recepción" fill style={{objectFit: 'contain'}} unoptimized crossOrigin="anonymous" priority sizes="200px"/></div>
                                ) : (service.isPublicView && onSignClick && (<Button onClick={() => onSignClick('reception')} disabled={isSigning} className="mb-2">{isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}Firmar Aquí</Button>))}
                            </div>
                            <div className="w-full text-center mt-auto pt-1 leading-tight"><p className="font-bold text-sm leading-tight">{customerName}</p><p className="text-[7px] text-gray-600">Al firmar, acepto los <Link href="/legal/terminos" target="_blank" className="underline">Términos y Condiciones</Link> y el <Link href="/legal/privacidad" target="_blank" className="underline">Aviso de Privacidad</Link> para la realización del servicio.</p></div>
                        </div>
                        <div className="border-2 border-black rounded-md overflow-hidden flex flex-col justify-between items-center p-1 min-h-[180px]">
                            <h3 className="font-bold p-1 w-full bg-gray-700 text-white text-xs text-center rounded-sm">SALIDA DEL TALLER</h3>
                            <div className="flex-grow flex items-center justify-center w-full min-h-[50px]">
                                {service.customerSignatureDelivery ? (<div className="relative w-full h-full"><Image src={normalizeDataUrl(service.customerSignatureDelivery)} alt="Firma de conformidad" fill style={{objectFit: 'contain'}} unoptimized crossOrigin="anonymous" priority sizes="200px"/></div>
                                ) : (service.isPublicView && onSignClick && (<Button onClick={() => onSignClick('delivery')} disabled={isSigning} className="bg-green-600 hover:bg-green-700 h-8 text-xs">{isSigning ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <Signature className="mr-2 h-3 w-3"/>}Firmar de Conformidad</Button>))}
                            </div>
                            <div className="w-full text-center mt-auto pt-1 leading-tight"><p className="font-bold text-sm leading-tight">{customerName}</p><p className="text-[7px] text-gray-600">{GARANTIA_CONDICIONES_TEXT}</p></div>
                        </div>
                   </section>
                </main>
                
                <footer className="mt-auto pt-2 text-xs">
                   <section className="mt-2 text-center text-gray-500 text-[10px] space-x-4">
                      <Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link>
                      <span>|</span>
                      <Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link>
                   </section>
                   {workshopInfo.fixedFooterText && (<div className="text-center mt-2 pt-2 border-t border-gray-200"><p className="text-[10px] text-muted-foreground whitespace-pre-wrap">{workshopInfo.fixedFooterText}</p></div>)}
                </footer>
            </div>
      </div>
      );
    }
});
ServiceSheetContent.displayName = "ServiceSheetContent";

  