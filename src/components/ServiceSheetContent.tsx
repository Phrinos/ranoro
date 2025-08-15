
"use client";

import type { QuoteRecord, WorkshopInfo, Vehicle, ServiceRecord } from '@/types';
import { format, isValid, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import { cn, formatCurrency, capitalizeWords, formatNumber, normalizeDataUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, CalendarCheck, CheckCircle, Ban, Clock, Eye, Signature, Loader2, AlertCircle, CalendarDays, Share2, Phone, Link as LinkIcon, Globe } from 'lucide-react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cancelAppointmentAction } from '@/app/(public)/s/actions';
import { useToast } from '@/hooks/use-toast';
import { parseDate } from '@/lib/forms';
import { GARANTIA_CONDICIONES_TEXT, INGRESO_CONDICIONES_TEXT } from '@/lib/constants/legal-text';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  googleMapsUrl: "https://share.google/7ow83ayhfb2iIOKUX"
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
    const receptionDate = parseDate(service.receptionDateTime);
    const deliveryDate = parseDate(service.deliveryDateTime);

    const formattedAppointmentDate = appointmentDate && isValid(appointmentDate) ? format(appointmentDate, "EEEE dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'", { locale: es }) : 'Fecha y hora por confirmar';
    const formattedReceptionDate = receptionDate && isValid(receptionDate) ? format(receptionDate, "dd MMMM, yyyy, HH:mm 'hrs'", { locale: es }) : 'Fecha no registrada';
    const formattedDeliveryDate = deliveryDate && isValid(deliveryDate) ? format(deliveryDate, "dd MMMM, yyyy, HH:mm 'hrs'", { locale: es }) : 'Fecha no registrada';

    const isAppointmentPending = status === 'agendado' && appointmentStatus === 'Sin Confirmar';

    const statusInfo = useMemo(() => {
        if (status === 'cancelado' || appointmentStatus === 'Cancelada') return { title: "CANCELADO", description: "Este servicio o cita ha sido cancelado.", badge: { text: "Cancelado", variant: "destructive" }, cardClass: "bg-red-50 border-red-200", titleClass: "text-red-800", descClass: "text-red-700" };
        
        if (status === 'agendado') {
          if (appointmentStatus === 'Confirmada') return { title: "CITA AGENDADA", description: formattedAppointmentDate, badge: { text: "Confirmada", variant: "success" }, cardClass: "bg-green-50 border-green-200", titleClass: "text-green-800", descClass: "text-green-700" };
          if (appointmentStatus === 'Sin Confirmar') return { title: "CITA PENDIENTE DE CONFIRMACIÓN", description: formattedAppointmentDate, badge: { text: "Pendiente", variant: "waiting" }, cardClass: "bg-yellow-50 border-yellow-200", titleClass: "text-yellow-800", descClass: "text-yellow-700" };
        }
        
        if (status === 'en taller') {
            const subStatus = service.subStatus;
            let badgeVariant: any = "secondary";
            if (subStatus === 'Ingresado') badgeVariant = "destructive";
            if (subStatus === 'En Espera de Refacciones') badgeVariant = "waiting";
            if (subStatus === 'Reparando') badgeVariant = "blue";
            if (subStatus === 'Completado') badgeVariant = "success";
            return { title: "ORDEN DE SERVICIO", description: `Vehículo ingresado el ${formattedReceptionDate}`, badge: { text: subStatus || 'En Taller', variant: badgeVariant }, cardClass: "bg-blue-50 border-blue-200", titleClass: "text-blue-800", descClass: "text-blue-700" };
        }
        
        if (status === 'entregado') return { title: "ORDEN DE SERVICIO", description: `Ingresado: ${formattedReceptionDate} | Entregado: ${formattedDeliveryDate}`, badge: { text: "Entregado", variant: "success" }, cardClass: "bg-green-50 border-green-200", titleClass: "text-green-800", descClass: "text-green-700" };
        
        return { title: "COTIZACIÓN DE SERVICIO", description: null, badge: null, cardClass: "bg-muted/50", titleClass: "text-foreground", descClass: "text-muted-foreground" };
    }, [status, appointmentStatus, formattedAppointmentDate, formattedReceptionDate, formattedDeliveryDate, service]);

    const shouldShowNextService = service.status === 'Entregado' && service.nextServiceInfo?.date && isValid(parseDate(service.nextServiceInfo.date)!);

    return (
      <>
        <Card className={cn("text-center", statusInfo.cardClass)}>
          <CardHeader className="p-4">
            <CardTitle className={cn("text-lg font-bold tracking-wider", statusInfo.titleClass)}>
              {statusInfo.title}
            </CardTitle>
            {statusInfo.description && (
              <p className={cn("font-semibold", statusInfo.descClass)}>
                {statusInfo.description}
              </p>
            )}
            {statusInfo.badge && <div className="mt-2"><Badge variant={statusInfo.badge.variant as any}>{statusInfo.badge.text}</Badge></div>}
          </CardHeader>
        </Card>
        {isAppointmentPending && onConfirmClick && (<div className="flex justify-center items-center gap-4 flex-wrap mt-6"><ConfirmDialog triggerButton={<Button variant="destructive" disabled={isConfirming}><Ban className="mr-2 h-4 w-4"/>Cancelar Cita</Button>} title="¿Estás seguro de cancelar esta cita?" description="Esta acción notificará al taller sobre la cancelación. Puedes volver a agendar más tarde." onConfirm={onCancelAppointment} isLoading={isConfirming}/><Button onClick={onConfirmClick} size="lg" disabled={isConfirming} className="bg-green-600 hover:bg-green-700">{isConfirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}{isConfirming ? 'Confirmando...' : 'Confirmar mi Cita'}</Button></div>)}
        {shouldShowNextService && (
            <div className="mt-4 p-3 border-2 border-red-500 bg-red-50 rounded-md text-red-800 text-center">
                <h4 className="font-bold text-sm flex items-center gap-2 justify-center"><CalendarCheck className="h-4 w-4"/>PRÓXIMO SERVICIO</h4>
                <p className="text-sm mt-1">
                    <strong>Fecha:</strong> {format(parseDate(service.nextServiceInfo!.date)!, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    {service.nextServiceInfo!.mileage && typeof service.nextServiceInfo!.mileage === 'number' && isFinite(service.nextServiceInfo!.mileage) && (
                        <> / <strong>KM:</strong> {formatNumber(service.nextServiceInfo!.mileage)}</>
                    )}
                </p>
            </div>
        )}
      </>
    );
});
StatusCard.displayName = 'StatusCard';

const SheetFooter = React.memo(({ workshopInfo, advisorName, advisorSignature }: { workshopInfo: Partial<WorkshopInfo>, advisorName?: string, advisorSignature?: string }) => (
    <div className="space-y-4">
        <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-4">
                    <div className="relative w-40 h-20 flex-shrink-0">
                        {advisorSignature && <Image src={normalizeDataUrl(advisorSignature)} alt="Firma del asesor" fill style={{objectFit:"contain"}} sizes="160px" />}
                    </div>
                    <div>
                        <p className="font-bold text-sm leading-tight">{capitalizeWords(advisorName || 'Asesor de Servicio')}</p>
                        <p className="text-xs text-muted-foreground">Asesor de Servicio</p>
                    </div>
                </div>
                 <div className="text-center md:text-left">
                    <p className="font-semibold text-lg">{workshopInfo.footerLine1 || '¡Gracias por su preferencia!'}</p>
                    <p className="text-muted-foreground">{workshopInfo.footerLine2 || 'Para dudas o aclaraciones, no dude en contactarnos.'}</p>
                    <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="link" className="text-base px-0 h-auto py-1 mt-1 bg-green-100 text-green-700 hover:bg-green-200">
                           <Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2"/> {workshopInfo.phone}
                        </Button>
                    </a>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <a href={workshopInfo.googleMapsUrl || "https://share.google/7ow83ayhfb2iIOKUX"} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:google-maps" className="h-6 w-6"/></a>
                    <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:whatsapp-icon" className="h-6 w-6"/></a>
                    <a href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:facebook" className="h-6 w-6"/></a>
                    <a href="https://www.instagram.com/ranoromx" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="skill-icons:instagram" className="h-6 w-6"/></a>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <Link href="/legal/terminos" target="_blank" className="hover:underline text-muted-foreground">Términos</Link>
                    <span className="text-muted-foreground">|</span>
                    <Link href="/legal/privacidad" target="_blank" className="hover:underline text-muted-foreground">Privacidad</Link>
                </div>
            </CardContent>
        </Card>
    </div>
));
SheetFooter.displayName = 'SheetFooter';

const SignatureActionCard = ({ onSignClick }: { onSignClick: () => void }) => (
  <Card className="bg-blue-50 border-blue-200">
    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-blue-800 font-medium text-center sm:text-left">
        Tu vehículo ya está en el taller. Por favor, autoriza los trabajos firmando la orden de servicio.
      </p>
      <Button onClick={onSignClick} className="w-full sm:w-auto flex-shrink-0">
        <Signature className="mr-2 h-4 w-4" />
        Firmar para Autorizar
      </Button>
    </CardContent>
  </Card>
);

// --- Main Component ---

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
    const [activeTab, setActiveTab] = useState('order');
    
    const effectiveWorkshopInfo = { ...initialWorkshopInfo, ...service.workshopInfo };
    const vehicle = service.vehicle as Vehicle | undefined;
    
    const status = (service.status || '').toLowerCase();
    
    const showSignatureAction = onSignClick && ((status === 'en taller' && !service.customerSignatureReception) || (status === 'entregado' && !service.customerSignatureDelivery));
    const signatureActionType = status === 'entregado' ? 'delivery' : 'reception';

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
    
    const tabs = useMemo(() => {
        const availableTabs = [
            { value: 'order', label: 'Orden de Servicio', content: <ServiceOrderTab service={service} vehicle={vehicle} onSignClick={onSignClick} isSigning={isSigning}/> },
        ];
        if (service.safetyInspection && Object.values(service.safetyInspection).some(v => v && v.status && v.status !== 'na')) {
            availableTabs.push({ value: 'checklist', label: 'Revisión de Seguridad', content: <SafetyChecklistDisplay inspection={service.safetyInspection} /> });
        }
        if (service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0)) {
            availableTabs.push({ value: 'photoreport', label: 'Reporte Fotográfico', content: <PhotoReportContent photoReports={service.photoReports} /> });
        }
        if (service.originalQuoteItems && service.originalQuoteItems.length > 0) {
            availableTabs.push({ value: 'quote', label: 'Cotización Original', content: <OriginalQuoteContent items={service.originalQuoteItems} /> });
        }
        return availableTabs;
    }, [service, vehicle, onSignClick, isSigning]);

    return (
      <div ref={ref} className="space-y-6">
        {showSignatureAction && <SignatureActionCard onSignClick={() => onSignClick(signatureActionType)} />}
        <SheetHeader service={service} workshopInfo={effectiveWorkshopInfo} />
        <ClientInfo service={service} vehicle={vehicle} />
        <StatusCard service={service} isConfirming={isConfirming} onConfirmClick={onConfirmClick} onCancelAppointment={handleCancelAppointment}/>
        {status === 'cotizacion' && onScheduleClick && <div className="text-center"><Button onClick={onScheduleClick} size="lg"><CalendarDays className="mr-2 h-5 w-5"/>Agendar Cita</Button></div>}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
                {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
            </TabsList>
            {tabs.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-6">
                    {tab.content}
                 </TabsContent>
            ))}
        </Tabs>

        <SheetFooter workshopInfo={effectiveWorkshopInfo} advisorName={service.serviceAdvisorName} advisorSignature={service.serviceAdvisorSignatureDataUrl}/>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";


// --- Tab Content Components ---

function ServiceOrderTab({ service, vehicle, onSignClick, isSigning }: { service: ServiceRecord, vehicle?: Vehicle, onSignClick?: (type: 'reception' | 'delivery') => void, isSigning?: boolean }) {
    const items = useMemo(() => (service?.serviceItems ?? []).map(it => ({ ...it, price: Number(it?.price) || 0 })), [service?.serviceItems]);
    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = items.reduce((acc, it) => acc + it.price, 0);
        const sub = total / (1 + 0.16);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Trabajos a Realizar y Costos</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {items.length > 0 ? items.map((item, index) => (
                            <div key={item.id || index} className="p-4 rounded-lg bg-background">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1"><p className="font-semibold">{item.name}</p>
                                    {item.suppliesUsed && item.suppliesUsed.length > 0 && (<p className="text-xs text-muted-foreground mt-1">Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}</p>)}</div>
                                    <p className="font-bold text-lg">{formatCurrency(item.price)}</p>
                                </div>
                            </div>
                        )) : <p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>}
                    </div>
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subTotal)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">IVA (16%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div>
                        <Separator className="my-2"/>
                        <div className="flex justify-between items-center font-bold text-base"><span>Total a Pagar:</span><span className="text-primary">{formatCurrency(totalCost)}</span></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Ingreso del Vehiculo al Taller</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <ReceptionDetails service={service} />
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Firma de Autorización</h4>
                        <SignatureDisplay type="reception" signatureUrl={service.customerSignatureReception} onSignClick={onSignClick} isSigning={isSigning}/>
                        <p className="text-xs text-muted-foreground whitespace-pre-line mt-2">{INGRESO_CONDICIONES_TEXT}</p>
                    </div>
                </CardContent>
            </Card>
            
            {service.status === 'Entregado' && (
                <Card>
                    <CardHeader><CardTitle>Salida del vehiculo del taller</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div className="border-t pt-4">
                             <h4 className="font-semibold mb-2">GARANTIA</h4>
                             <p className="text-xs text-muted-foreground whitespace-pre-line">{GARANTIA_CONDICIONES_TEXT}</p>
                        </div>
                        <h4 className="font-semibold mb-2">Firma de Conformidad</h4>
                        <SignatureDisplay type="delivery" signatureUrl={service.customerSignatureDelivery} onSignClick={onSignClick} isSigning={isSigning} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ReceptionDetails({ service }: { service: ServiceRecord }) {
    const fuelLevelMap: Record<string, number> = { 'Vacío': 0, '1/8': 12.5, '1/4': 25, '3/8': 37.5, '1/2': 50, '5/8': 62.5, '3/4': 75, '7/8': 87.5, 'Lleno': 100 };
    const fuelPercentage = service.fuelLevel ? fuelLevelMap[service.fuelLevel] ?? 0 : 0;
    const fuelColor = fuelPercentage <= 25 ? "bg-red-500" : fuelPercentage <= 50 ? "bg-orange-400" : fuelPercentage <= 87.5 ? "bg-yellow-400" : "bg-green-500";
    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><h4 className="font-semibold">Condiciones del Vehículo</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.vehicleConditions || 'No especificado'}</p></div>
                <div><h4 className="font-semibold">Pertenencias del Cliente</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.customerItems || 'No especificado'}</p></div>
            </div>
            <div><h4 className="font-semibold">Nivel de Combustible</h4>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300 mt-2"><div className={cn("h-full transition-all", fuelColor)} style={{ width: `${fuelPercentage}%` }} /></div>
                <p className="text-center text-xs mt-1">{service.fuelLevel || 'N/A'}</p>
            </div>
        </>
    );
}

function SignatureDisplay({ type, signatureUrl, onSignClick, isSigning }: { type: 'reception' | 'delivery', signatureUrl?: string | null, onSignClick?: (type: 'reception' | 'delivery') => void, isSigning?: boolean }) {
    const label = type === 'reception' ? 'CLIENTE (RECEPCIÓN)' : 'CLIENTE (ENTREGA)';
    return (
        <div className="text-center">
            <p className="text-xs font-semibold">{label}</p>
            <div className="mt-1 p-2 h-20 border rounded-md bg-background flex items-center justify-center">
                {signatureUrl ? <Image src={normalizeDataUrl(signatureUrl)} alt={`Firma de ${type}`} width={150} height={75} style={{objectFit:'contain'}} unoptimized/> 
                : (onSignClick ? <Button size="sm" onClick={() => onSignClick(type)} disabled={isSigning}>{isSigning ? 'Cargando...' : 'Firmar'}</Button> : <p className="text-xs text-muted-foreground">Pendiente</p>)}
            </div>
        </div>
    );
}


function SafetyChecklistDisplay({ inspection }: { inspection: any }) {
    return (
        <Card>
            <CardHeader><CardTitle>Revisión de Puntos de Seguridad</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">La visualización detallada de los puntos de seguridad se mostrará aquí.</p></CardContent>
        </Card>
    );
}

function PhotoReportContent({ photoReports }: { photoReports: any[] }) {
    return (
        <Card>
            <CardHeader><CardTitle>Reporte Fotográfico</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {photoReports.map(report => (
                    <div key={report.id}>
                        <p className="font-semibold">{report.description}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                            {report.photos.map((photo: string, i: number) => <div key={i} className="relative aspect-square bg-muted rounded"><Image src={photo} alt="Foto de servicio" fill style={{objectFit: 'cover'}}/></div>)}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function OriginalQuoteContent({ items }: { items: any[] }) {
    const total = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
    return (
        <Card>
            <CardHeader><CardTitle>Conceptos de la Cotización Original</CardTitle></CardHeader>
            <CardContent>
                 <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 bg-background rounded">
                            <span>{item.name}</span>
                            <span className="font-semibold">{formatCurrency(item.price)}</span>
                        </div>
                    ))}
                 </div>
                 <Separator className="my-4"/>
                 <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Original:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                 </div>
            </CardContent>
        </Card>
    );
}

    