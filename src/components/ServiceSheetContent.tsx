
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

    // --- Date and Cost Calculations ---
    const creationDate = coerceDate(service.serviceDate) || new Date();
    const formattedCreationDate = isValid(creationDate) ? format(creationDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    const validityDate = isValid(creationDate) ? format(addDays(creationDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const appointmentDate = coerceDate(service.appointmentDateTime);
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
    
    const termsText = `GARANTIA RANORO: Nuestros trabajos cuentan con garantía de 60 días o 1,000 km (lo que suceda primero), aplicable exclusivamente al trabajo realizado por Ranoro y, en su caso, a las refacciones suministradas e instaladas por nosotros; la garantía consiste en corregir sin costo el mismo concepto reparado, una vez que nuestro diagnóstico confirme la relación directa de la falla con la intervención realizada. Quedan excluidos: fallas no relacionadas con el servicio, componentes no intervenidos y daños consecuenciales; así como las derivadas de desgaste normal, mal uso, falta de mantenimiento, sobrecalentamiento, golpes, ingreso de agua o polvo, uso de combustible o lubricantes de mala calidad, o modificaciones de terceros. Las refacciones aportadas por el cliente no cuentan con garantía por parte del taller. Cualquier intervención de terceros o manipulación posterior del sistema anula la presente garantía. La atención de garantía se realiza exclusivamente en el taller, previa revisión y diagnóstico. Precios en MXN. Los precios y la disponibilidad de refacciones pueden cambiar sin previo aviso por parte de los proveedores.`;

    // --- Status Logic ---
    const status = (service.status || '').toLowerCase();
    const appointmentStatus = service.appointmentStatus;

    const isQuoteStatus = status === 'cotizacion';
    const isAppointmentConfirmed = status === 'agendado' && appointmentStatus === 'Confirmada';
    const isAppointmentPending = status === 'agendado' && appointmentStatus === 'Sin Confirmar';
    const isAppointmentCancelled = status === 'agendado' && appointmentStatus === 'Cancelada';
    
    const getStatusCardContent = () => {
        if (isAppointmentCancelled) return { title: "CITA CANCELADA", description: "Esta cita ha sido cancelada.", badge: { text: "Cancelada", variant: "destructive" } };
        if (isAppointmentConfirmed) return { title: "CITA AGENDADA", description: formattedAppointmentDate, badge: { text: "Confirmada", variant: "success" } };
        if (isAppointmentPending) return { title: "CITA PENDIENTE DE CONFIRMACIÓN", description: formattedAppointmentDate, badge: { text: "Pendiente", variant: "waiting" } };
        if (status === 'en taller') return { title: "ORDEN DE SERVICIO", description: `Vehículo ingresado el ${format(parseDate(service.receptionDateTime)!, "dd MMMM, HH:mm", { locale: es })}`, badge: { text: service.subStatus || 'En Taller', variant: "secondary" } };
        if (status === 'entregado') return { title: "ORDEN DE SERVICIO", description: `Vehículo entregado el ${format(parseDate(service.deliveryDateTime)!, "dd MMMM, HH:mm", { locale: es })}`, badge: { text: "Entregado", variant: "success" } };
        return { title: "COTIZACIÓN DE SERVICIO", description: null, badge: null };
    };

    const statusCard = getStatusCardContent();
    const isServiceFlow = status === 'en taller' || status === 'entregado';
    
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
    
    return (
      <div ref={ref} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
                  <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" sizes="150px" />
              </div>
              <div className="text-left sm:text-right">
                <p className="font-bold text-lg">Folio: {service.id}</p>
                <p className="text-sm text-muted-foreground">{formattedCreationDate}</p>
              </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><User className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Cliente</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{customerName}</p><p className="text-sm text-muted-foreground">{customerPhone}</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Vehículo</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{vehicleMake} {vehicleModel} ({vehicleYear})</p><p className="text-muted-foreground">{vehicleLicensePlate}</p>{vehicle?.color && <p className="text-xs text-muted-foreground">Color: {vehicle.color}</p>}{service.mileage && <p className="text-xs text-muted-foreground">KM: {formatNumber(service.mileage)}</p>}</CardContent></Card>
        </div>
        
        <Card className={cn("bg-muted/50", isServiceFlow && "bg-red-50 border-red-200")}>
          <CardHeader className="p-4 text-center">
              <div className="space-y-1">
                  <CardTitle className={cn("text-lg font-bold tracking-wider text-foreground", isServiceFlow && "text-red-800")}>{statusCard.title}</CardTitle>
                  {statusCard.description && <p className={cn("font-semibold text-muted-foreground", isServiceFlow && "text-red-700")}>{statusCard.description}</p>}
              </div>
              {statusCard.badge && (<div className="mt-2"><Badge variant={statusCard.badge.variant as any}>{statusCard.badge.text}</Badge></div>)}
          </CardHeader>
        </Card>
        
        {isQuoteStatus && onScheduleClick && <div className="text-center"><Button onClick={onScheduleClick} size="lg"><CalendarDays className="mr-2 h-5 w-5"/>Agendar Cita</Button></div>}
        {isAppointmentPending && onConfirmClick && (<div className="flex justify-center items-center gap-4 flex-wrap"><ConfirmDialog triggerButton={<Button variant="destructive" disabled={isCancelling}><Ban className="mr-2 h-4 w-4"/>Cancelar Cita</Button>} title="¿Estás seguro de cancelar esta cita?" description="Esta acción notificará al taller sobre la cancelación. Puedes volver a agendar más tarde." onConfirm={handleCancelAppointment} isLoading={isCancelling}/><Button onClick={onConfirmClick} size="lg" disabled={isConfirming} className="bg-green-600 hover:bg-green-700">{isConfirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}{isConfirming ? 'Confirmando...' : 'Confirmar mi Cita'}</Button></div>)}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2"><Card><CardHeader><CardTitle>Trabajos a realizar</CardTitle></CardHeader><CardContent><div className="space-y-4">{items.map((item, index) => (<div key={item.id || index} className="p-4 rounded-lg bg-background"><div className="flex justify-between items-start"><div className="flex-1"><p className="font-semibold">{item.name}</p>{item.suppliesUsed && item.suppliesUsed.length > 0 && (<p className="text-xs text-muted-foreground mt-1">Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}</p>)}</div><p className="font-bold text-lg">{formatCurrency(item.price)}</p></div></div>))}{items.length === 0 && (<p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>)}</div><p className="text-xs text-muted-foreground mt-4 pt-4 border-t">{isServiceFlow ? GARANTIA_CONDICIONES_TEXT : "Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Esta cotización tiene una vigencia de 15 días a partir de su fecha de emisión. Los precios de las refacciones están sujetos a cambios sin previo aviso por parte de los proveedores."}</p></CardContent></Card></div>
          <div className="lg:col-span-1 space-y-6">
              <Card><CardHeader><CardTitle className="text-base">Resumen de Costos</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subTotal)}</span></div><div className="flex justify-between items-center"><span className="text-muted-foreground">IVA (16%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div><Separator className="my-2"/><div className="flex justify-between items-center font-bold text-base"><span>Total a Pagar:</span><span className="text-primary">{formatCurrency(totalCost)}</span></div>{isQuoteStatus && <div className="text-center text-sm font-semibold mt-4 pt-4 border-t"><p>Cotización Válida hasta el {validityDate}.</p></div>}</CardContent></Card>
          </div>
        </div>
        
        {isServiceFlow && (
          <Card>
            <CardHeader><CardTitle>Detalles de Recepción</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><h4 className="font-semibold">Condiciones del Vehículo</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.vehicleConditions || 'No especificado'}</p></div>
                    <div><h4 className="font-semibold">Pertenencias del Cliente</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.customerItems || 'No especificado'}</p></div>
                </div>
                <div className="flex items-center gap-4"><span className="font-semibold">Nivel de Combustible:</span><Badge variant="outline">{service.fuelLevel || 'N/A'}</Badge></div>
                <div className="text-center mt-4 pt-4 border-t"><h4 className="font-semibold mb-2">Firma de Recepción</h4><div className="mx-auto bg-muted/50 border rounded-md h-32 w-full max-w-sm flex items-center justify-center">
                    {service.customerSignatureReception ? (<Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma de recepción" width={250} height={100} style={{objectFit: 'contain'}} />) : (
                        onSignClick ? (<Button onClick={() => onSignClick('reception')} disabled={isSigning} className="mb-2">{isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>} Firmar Aquí</Button>) : <p className="text-muted-foreground text-sm">Firma pendiente</p>
                    )}
                </div></div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6 pt-6 mt-6 border-t">
            <Card><CardContent className="p-4 flex items-start gap-4">
                {service.serviceAdvisorSignatureDataUrl && (<div className="relative w-20 h-20 flex-shrink-0"><Image src={normalizeDataUrl(service.serviceAdvisorSignatureDataUrl)} alt="Firma del asesor" fill style={{objectFit:"contain"}} sizes="80px" /></div>)}
                <div className="space-y-1"><p className="font-bold text-sm">¡Gracias por su preferencia!</p><p className="text-xs text-muted-foreground">Para dudas o aclaraciones, no dude en contactarnos.</p><Button asChild size="sm" className="mt-1 bg-green-100 text-green-800 hover:bg-green-200"><a href={`https://wa.me/${workshopInfo.phone}`} target="_blank" rel="noopener noreferrer"><Icon icon="logos:whatsapp-icon" className="h-4 w-4 mr-2" />{workshopInfo.phone}</a></Button></div>
            </CardContent></Card>
            <Card>
              <CardContent className="p-2 flex justify-around items-center">
                  <a href={workshopInfo.googleMapsUrl || "#"} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Globe className="h-5 w-5 text-muted-foreground"/></a>
                  <a href={`https://wa.me/${workshopInfo.phone}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:whatsapp-icon" className="h-5 w-5"/></a>
                  <a href="#" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:facebook" className="h-5 w-5"/></a>
                  <a href="#" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="skill-icons:instagram" className="h-5 w-5"/></a>
              </CardContent>
            </Card>
        </div>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
