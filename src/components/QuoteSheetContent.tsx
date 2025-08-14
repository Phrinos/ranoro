

"use client";

import type { QuoteRecord, WorkshopInfo, Vehicle, AgendadoSubStatus } from '@/types';
import { format, isValid, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, formatCurrency, capitalizeWords, formatNumber } from "@/lib/utils";
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
  logoUrl: "/ranoro-logo.png",
};

function coerceDate(v: unknown): Date | null {
  if (!v) return null;
  // Firestore Timestamp
  if (typeof (v as any)?.toDate === 'function') {
    const d = (v as any).toDate();
    return isValid(d) ? d : null;
  }
  // Date ya creado
  if (v instanceof Date) return isValid(v) ? v : null;
  // numérico: ms/segundos
  if (typeof v === 'number') {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isValid(d) ? d : null;
  }
  // string: ISO o datetime-local (YYYY-MM-DDTHH:mm)
  if (typeof v === 'string') {
    // intenta ISO
    const isoTry = parseISO(v);
    if (isValid(isoTry)) return isoTry;
    // intenta cast genérico
    const generic = new Date(v);
    if (isValid(generic)) return generic;
  }
  return null;
}

interface QuoteContentProps {
  quote: QuoteRecord;
  onScheduleClick?: () => void;
  onConfirmClick?: () => void;
  isConfirming?: boolean;
}

export const QuoteContent = React.forwardRef<HTMLDivElement, QuoteContentProps>(({ quote, onScheduleClick, onConfirmClick, isConfirming }, ref) => {
    
    const vehicle = quote.vehicle as Vehicle | null || null;
    const workshopInfo = quote.workshopInfo || initialWorkshopInfo;
    const IVA_RATE = 0.16;

    const quoteDate = coerceDate((quote as any).serviceDate) || new Date();
    const formattedQuoteDate = isValid(quoteDate) ? format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const appointmentDate = coerceDate((quote as any).appointmentDateTime);
    const formattedAppointmentDate = appointmentDate
      ? format(appointmentDate, "EEEE dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'", { locale: es })
      : 'Fecha y hora por confirmar';


    const items = useMemo(() => (quote?.serviceItems ?? []).map(it => ({
        ...it,
        price: Number(it?.price) || 0,
    })), [quote?.serviceItems]);

    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = items.reduce((acc, it) => acc + it.price, 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);
    
    const termsText = `Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Esta cotización tiene una vigencia de 15 días a partir de su fecha de emisión. Los precios de las refacciones están sujetos a cambios sin previo aviso por parte de los proveedores.`;

    const status = (quote.status || '').toLowerCase();
    const appointmentStatus = quote.appointmentStatus;

    const isQuoteStatus = status === 'cotizacion';
    const isAppointmentConfirmed = status === 'agendado' && appointmentStatus === 'Confirmada';
    const isAppointmentPending = status === 'agendado' && appointmentStatus === 'Sin Confirmar';
    const isAppointmentCancelled = status === 'agendado' && appointmentStatus === 'Cancelada';
    
    const getStatusCardContent = () => {
        if (isAppointmentCancelled) {
            return {
                className: "bg-red-100 border-red-200 dark:bg-red-900/50 dark:border-red-800",
                title: "CITA CANCELADA",
                titleClassName: "text-red-900 dark:text-red-200",
                description: "Esta cita ha sido cancelada.",
                descriptionClassName: "text-red-800 dark:text-red-300"
            };
        }
        if (isAppointmentConfirmed || isAppointmentPending) {
            return {
                className: "bg-blue-50 border-blue-200 dark:bg-blue-900/50 dark:border-blue-800",
                title: isAppointmentConfirmed ? "CITA AGENDADA CONFIRMADA" : "CITA PENDIENTE DE CONFIRMACIÓN",
                titleClassName: "text-blue-900 dark:text-blue-200",
                description: formattedAppointmentDate,
                descriptionClassName: "text-blue-800 dark:text-blue-300"
            };
        }
        // Default to quote status
        return {
            className: "bg-amber-100 border-amber-200 dark:bg-amber-900/50 dark:border-amber-800",
            title: "COTIZACIÓN DE SERVICIO",
            titleClassName: "text-amber-900 dark:text-amber-200",
            description: null,
            descriptionClassName: ""
        };
    };

    const statusCard = getStatusCardContent();

    
    return (
      <div ref={ref} className="space-y-6">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
                    <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" />
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-lg">Folio: {quote.id}</p>
                  <p className="text-sm text-muted-foreground">{formattedQuoteDate}</p>
                </div>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <User className="w-8 h-8 text-muted-foreground flex-shrink-0"/>
                <CardTitle className="text-base">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="font-semibold">{capitalizeWords(quote.customerName || vehicle?.ownerName || '')}</p>
                <p className="text-sm text-muted-foreground">{quote.customerPhone || vehicle?.ownerPhone || 'Teléfono no disponible'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                 <CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/>
                 <CardTitle className="text-base">Vehículo</CardTitle>
                 </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="font-semibold">{vehicle?.make || ''} {vehicle?.model || ''} ({vehicle?.year || 'N/A'})</p>
                 <p className="text-muted-foreground">{vehicle?.licensePlate || 'N/A'}</p>
                  {vehicle?.color && <p className="text-xs text-muted-foreground">Color: {vehicle.color}</p>}
                  {vehicle?.currentMileage && <p className="text-xs text-muted-foreground">KM: {formatNumber(vehicle.currentMileage)}</p>}
              </CardContent>
            </Card>
        </div>
        
        <Card className={cn(statusCard.className)}>
            <CardHeader className="p-4 text-center">
                <div className="space-y-1">
                    <CardTitle className={cn("text-lg font-bold tracking-wider", statusCard.titleClassName)}>
                        {statusCard.title}
                    </CardTitle>
                    {statusCard.description && (
                        <p className={cn("font-semibold", statusCard.descriptionClassName)}>
                            {statusCard.description}
                        </p>
                    )}
                </div>
                {isAppointmentConfirmed && (
                    <Badge className="mt-2 bg-green-600 text-white">
                        <CheckCircle className="mr-1 h-3 w-3"/>
                        Confirmada
                    </Badge>
                )}
            </CardHeader>
        </Card>
        
        {isQuoteStatus && onScheduleClick && (
            <div className="text-center">
                <Button onClick={onScheduleClick} size="lg">
                    <CalendarDays className="mr-2 h-5 w-5"/>
                    Agendar Cita
                </Button>
            </div>
        )}
        
        {isAppointmentPending && onConfirmClick && (
            <div className="text-center">
                <Button onClick={onConfirmClick} size="lg" disabled={isConfirming}>
                    {isConfirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}
                    {isConfirming ? 'Confirmando...' : 'Confirmar mi Cita'}
                </Button>
            </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Trabajos a realizar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {items.map((item, index) => (
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
                            {items.length === 0 && (
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
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(subTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">IVA (16%):</span>
                            <span className="font-medium">{formatCurrency(taxAmount)}</span>
                        </div>
                        <Separator className="my-2"/>
                        <div className="flex justify-between items-center font-bold text-base">
                            <span>Total a Pagar:</span>
                            <span className="text-primary">{formatCurrency(totalCost)}</span>
                        </div>
                         <div className="text-center text-sm font-semibold mt-4 pt-4 border-t">
                            <p>Cotización Válida hasta el {validityDate}.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        
        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center flex-shrink-0">
                    <div className="p-2 bg-white flex items-center justify-center w-48 h-24 border rounded-md">
                      {quote.serviceAdvisorSignatureDataUrl ? (
                        <img src={quote.serviceAdvisorSignatureDataUrl} alt="Firma del asesor" className="mx-auto object-contain max-h-full max-w-full" />
                      ) : <p className="text-xs text-muted-foreground">Firma no disponible</p>}
                    </div>
                    <p className="font-semibold text-sm mt-2">{quote.serviceAdvisorName || 'Asesor no asignado'}</p>
                    <p className="text-xs text-muted-foreground">Asesor de Servicio</p>
                </div>
                <div className="text-center md:text-left flex-grow">
                    <h3 className="text-lg font-bold">¡Gracias por su preferencia!</h3>
                    <p className="text-muted-foreground mt-1">Para dudas o aclaraciones, no dude en contactarnos.</p>
                     <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <Badge className="mt-4 bg-green-100 text-green-800 text-base py-2 px-4 hover:bg-green-200">
                           <Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2"/> {workshopInfo.phone}
                        </Badge>
                     </a>
                </div>
            </CardContent>
             <CardContent className="p-4 border-t">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex justify-center md:justify-start items-center gap-4">
                        <a href={workshopInfo.googleMapsUrl || "https://www.ranoro.mx"} target="_blank" rel="noopener noreferrer" title="Sitio Web"><Icon icon="mdi:web" className="h-6 w-6 text-muted-foreground hover:text-primary"/></a>
                        <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"><Icon icon="logos:whatsapp-icon" className="h-6 w-6"/></a>
                        <a href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Facebook"><Icon icon="logos:facebook" className="h-6 w-6"/></a>
                        <a href="https://www.instagram.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Instagram"><Icon icon="skill-icons:instagram" className="h-6 w-6"/></a>
                    </div>
                    <div className="text-xs text-muted-foreground text-center md:text-right space-x-2">
                        <Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link>
                        <span>|</span>
                        <Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    );
});
QuoteContent.displayName = "QuoteContent";
