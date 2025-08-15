
"use client";

import type { QuoteRecord, WorkshopInfo, Vehicle, ServiceRecord } from '@/types';
import { format, isValid, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import { cn, formatCurrency, capitalizeWords, formatNumber, normalizeDataUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, CalendarCheck, CheckCircle, Ban, Clock, Eye, Signature, Loader2, AlertCircle, CalendarDays, Share2, Phone, Link as LinkIcon, Globe, MessageSquare } from 'lucide-react';
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
  googleMapsUrl: "https://maps.app.goo.gl/u5K8Gv4k5J6H7q8XA"
};

const coerceDate = (v: unknown): Date | null => {
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
};

// --- Sub-components for better structure ---

const SheetHeader = React.memo(({ service, workshopInfo }: { service: ServiceRecord, workshopInfo: Partial<WorkshopInfo> }) => {
  const creationDate = coerceDate(service.serviceDate) || new Date();
  const formattedCreationDate = isValid(creationDate) ? format(creationDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
              <Image src={workshopInfo.logoUrl!} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" sizes="150px" />
          </div>
          <div className="text-left sm:text-right">
            <p className="font-bold text-lg">Folio: {service.id}</p>
            <p className="text-sm text-muted-foreground">{formattedCreationDate}</p>
          </div>
      </CardHeader>
    </Card>
  );
});
SheetHeader.displayName = 'SheetHeader';

const ClientInfo = React.memo(({ service, vehicle }: { service: ServiceRecord, vehicle?: Vehicle }) => {
  const customerName = capitalizeWords(service.customerName || vehicle?.ownerName || '');
  const customerPhone = vehicle?.ownerPhone || 'Teléfono no disponible';
  const vehicleMake = vehicle?.make || '';
  const vehicleModel = vehicle?.model || '';
  const vehicleYear = vehicle?.year || 'N/A';
  const vehicleLicensePlate = vehicle?.licensePlate || service.vehicleIdentifier || 'N/A';
  
  return(
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><User className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Cliente</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{customerName}</p><p className="text-sm text-muted-foreground">{customerPhone}</p></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Vehículo</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{vehicleMake} {vehicleModel} ({vehicleYear})</p><p className="text-muted-foreground">{vehicleLicensePlate}</p>{vehicle?.color && <p className="text-xs text-muted-foreground">Color: {vehicle.color}</p>}{service.mileage && <p className="text-xs text-muted-foreground">KM: {formatNumber(service.mileage)}</p>}</CardContent></Card>
    </div>
  );
});
ClientInfo.displayName = 'ClientInfo';


const StatusCard = React.memo(({ service, isConfirming, onConfirmClick, onCancelAppointment }: { service: ServiceRecord, isConfirming?: boolean, onConfirmClick?: () => void, onCancelAppointment: () => void }) => {
    const status = (service.status || '').toLowerCase();
    const appointmentStatus = service.appointmentStatus;
    const appointmentDate = coerceDate(service.appointmentDateTime);
    const formattedAppointmentDate = appointmentDate ? format(appointmentDate, "EEEE dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'", { locale: es }) : 'Fecha y hora por confirmar';
    const isAppointmentPending = status === 'agendado' && appointmentStatus === 'Sin Confirmar';

    const statusInfo = useMemo(() => {
      if (status === 'cancelado' || appointmentStatus === 'Cancelada') return { title: "CANCELADO", description: "Este servicio o cita ha sido cancelado.", badge: { text: "Cancelado", variant: "destructive" } };
      if (appointmentStatus === 'Confirmada') return { title: "CITA AGENDADA", description: formattedAppointmentDate, badge: { text: "Confirmada", variant: "success" } };
      if (isAppointmentPending) return { title: "CITA PENDIENTE DE CONFIRMACIÓN", description: formattedAppointmentDate, badge: { text: "Pendiente", variant: "waiting" } };
      if (status === 'en taller') return { title: "ORDEN DE SERVICIO", description: `Vehículo ingresado el ${format(parseDate(service.receptionDateTime)!, "dd MMMM, HH:mm", { locale: es })}`, badge: { text: service.subStatus || 'En Taller', variant: "secondary" } };
      if (status === 'entregado') return { title: "ORDEN DE SERVICIO", description: `Vehículo entregado el ${format(parseDate(service.deliveryDateTime)!, "dd MMMM, HH:mm", { locale: es })}`, badge: { text: "Entregado", variant: "success" } };
      return { title: "COTIZACIÓN DE SERVICIO", description: null, badge: null };
    }, [status, appointmentStatus, formattedAppointmentDate, service]);

    return (
      <>
        <Card className={cn("bg-muted/50 text-center", (status === 'en taller' || status === 'entregado') && "bg-red-50 border-red-200")}>
          <CardHeader className="p-4">
            <CardTitle className={cn("text-lg font-bold tracking-wider text-foreground", (status === 'en taller' || status === 'entregado') && "text-red-800")}>
              {statusInfo.title}
            </CardTitle>
            {statusInfo.description && (
              <p className={cn("font-semibold text-muted-foreground", (status === 'en taller' || status === 'entregado') && "text-red-700")}>
                {statusInfo.description}
              </p>
            )}
            {statusInfo.badge && <div className="mt-2"><Badge variant={statusInfo.badge.variant as any}>{statusInfo.badge.text}</Badge></div>}
          </CardHeader>
        </Card>
         {isAppointmentPending && onConfirmClick && (<div className="flex justify-center items-center gap-4 flex-wrap mt-6"><ConfirmDialog triggerButton={<Button variant="destructive" disabled={isConfirming}><Ban className="mr-2 h-4 w-4"/>Cancelar Cita</Button>} title="¿Estás seguro de cancelar esta cita?" description="Esta acción notificará al taller sobre la cancelación. Puedes volver a agendar más tarde." onConfirm={onCancelAppointment} isLoading={isConfirming}/><Button onClick={onConfirmClick} size="lg" disabled={isConfirming} className="bg-green-600 hover:bg-green-700">{isConfirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}{isConfirming ? 'Confirmando...' : 'Confirmar mi Cita'}</Button></div>)}
      </>
    );
});
StatusCard.displayName = 'StatusCard';

const ServiceBreakdown = React.memo(({ items, totalCost, isServiceFlow }: { items: ServiceRecord['serviceItems'], totalCost: number, isServiceFlow: boolean }) => {
    const termsText = isServiceFlow ? GARANTIA_CONDICIONES_TEXT : "Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Esta cotización tiene una vigencia de 15 días a partir de su fecha de emisión. Los precios de las refacciones están sujetos a cambios sin previo aviso por parte de los proveedores.";
    
    return (
        <Card>
            <CardHeader><CardTitle>Trabajos a realizar</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">{items.map((item, index) => (<div key={item.id || index} className="p-4 rounded-lg bg-background"><div className="flex justify-between items-start"><div className="flex-1"><p className="font-semibold">{item.name}</p>{item.suppliesUsed && item.suppliesUsed.length > 0 && (<p className="text-xs text-muted-foreground mt-1">Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}</p>)}</div><p className="font-bold text-lg">{formatCurrency(item.price)}</p></div></div>))}{items.length === 0 && (<p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>)}</div>
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">{termsText}</div>
            </CardContent>
        </Card>
    );
});
ServiceBreakdown.displayName = 'ServiceBreakdown';

const TotalsCard = React.memo(({ subTotal, taxAmount, totalCost, validityDate, isQuoteStatus }: { subTotal: number, taxAmount: number, totalCost: number, validityDate: string, isQuoteStatus: boolean }) => (
    <Card>
        <CardHeader><CardTitle className="text-base">Resumen de Costos</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subTotal)}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">IVA (16%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div>
            <Separator className="my-2"/>
            <div className="flex justify-between items-center font-bold text-base"><span>Total a Pagar:</span><span className="text-primary">{formatCurrency(totalCost)}</span></div>
            {isQuoteStatus && <div className="text-center text-sm font-semibold mt-4 pt-4 border-t"><p>Cotización Válida hasta el {validityDate}.</p></div>}
        </CardContent>
    </Card>
));
TotalsCard.displayName = 'TotalsCard';

const SheetFooter = React.memo(({ workshopInfo, advisorName, advisorSignature }: { workshopInfo: Partial<WorkshopInfo>, advisorName?: string, advisorSignature?: string }) => (
    <Card className="mt-6">
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    {advisorSignature && (
                        <div className="relative w-48 h-24 mb-2">
                            <Image src={normalizeDataUrl(advisorSignature)} alt="Firma del asesor" fill style={{ objectFit: "contain" }} sizes="192px" />
                        </div>
                    )}
                    <p className="font-bold text-sm leading-tight">{advisorName || 'Asesor de Servicio'}</p>
                    <p className="text-xs text-muted-foreground">Asesor de Servicio</p>
                </div>
                <div className="text-center md:text-right">
                    <p className="font-semibold">{workshopInfo.footerLine1 || '¡Gracias por su preferencia!'}</p>
                    <p className="text-sm text-muted-foreground">{workshopInfo.footerLine2 || 'Para dudas o aclaraciones, no dude en contactarnos.'}</p>
                    <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="link" className="text-base px-0">{workshopInfo.phone}</Button>
                    </a>
                </div>
            </div>
            <Separator className="my-3"/>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <a href={workshopInfo.googleMapsUrl || "#"} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Globe className="h-5 w-5 text-muted-foreground"/></a>
                    <a href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:whatsapp-icon" className="h-5 w-5"/></a>
                    <a href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:facebook" className="h-5 w-5"/></a>
                    <a href="https://www.instagram.com/ranoromx" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:instagram-icon" className="h-5 w-5"/></a>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <Link href="/legal/terminos" target="_blank" className="hover:underline text-muted-foreground">Términos</Link>
                    <Link href="/legal/privacidad" target="_blank" className="hover:underline text-muted-foreground">Privacidad</Link>
                </div>
            </div>
        </CardContent>
    </Card>
));
SheetFooter.displayName = 'SheetFooter';

// --- Main Component ---

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ service, onScheduleClick, onConfirmClick, isConfirming }, ref) => {
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);
    
    const effectiveWorkshopInfo = { ...initialWorkshopInfo, ...service.workshopInfo };
    const vehicle = service.vehicle as Vehicle | undefined;
    const IVA_RATE = 0.16;

    const items = useMemo(() => (service?.serviceItems ?? []).map(it => ({ ...it, price: Number(it?.price) || 0 })), [service?.serviceItems]);
    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = items.reduce((acc, it) => acc + it.price, 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);

    const creationDate = coerceDate(service.serviceDate) || new Date();
    const validityDate = isValid(creationDate) ? format(addDays(creationDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const status = (service.status || '').toLowerCase();
    const isQuoteStatus = status === 'cotizacion';
    const isServiceFlow = status === 'en taller' || status === 'entregado';

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
    
    return (
      <div ref={ref} className="space-y-6">
        <SheetHeader service={service} workshopInfo={effectiveWorkshopInfo} />
        <ClientInfo service={service} vehicle={vehicle} />
        <StatusCard service={service} isConfirming={isConfirming} onConfirmClick={onConfirmClick} onCancelAppointment={handleCancelAppointment}/>
        {isQuoteStatus && onScheduleClick && <div className="text-center"><Button onClick={onScheduleClick} size="lg"><CalendarDays className="mr-2 h-5 w-5"/>Agendar Cita</Button></div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <ServiceBreakdown items={items} totalCost={totalCost} isServiceFlow={isServiceFlow}/>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <TotalsCard subTotal={subTotal} taxAmount={taxAmount} totalCost={totalCost} validityDate={validityDate} isQuoteStatus={isQuoteStatus} />
          </div>
        </div>
        
        <SheetFooter workshopInfo={effectiveWorkshopInfo} advisorName={service.serviceAdvisorName} advisorSignature={service.serviceAdvisorSignatureDataUrl}/>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
