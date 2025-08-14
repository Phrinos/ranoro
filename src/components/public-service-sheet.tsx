

"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, CalendarCheck, CheckCircle, XCircle, Clock, Ellipsis, Eye, Signature, Loader2, AlertCircle, CalendarDays, Share2 } from 'lucide-react';
import { QuoteContent } from '@/components/QuoteSheetContent';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { parseDate } from '@/lib/forms';
import { Badge } from '@/components/ui/badge';
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

interface ServiceSheetContentProps {
  record: any;
  onSignClick?: (type: 'reception' | 'delivery') => void;
  onScheduleClick?: () => void;
  isSigning?: boolean;
  activeTab: string;
}

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ record, onSignClick, onScheduleClick, isSigning, activeTab }, ref) => {
    
    const isQuoteOrScheduled = record.status === 'Cotizacion' || record.status === 'Agendado';

    if (isQuoteOrScheduled) {
      return <QuoteContent ref={ref} quote={record} onScheduleClick={onScheduleClick} />;
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
