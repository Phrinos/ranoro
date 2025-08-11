
"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Signature, Loader2, Phone, MapPin, User, Car as CarIcon, FileText as FileTextIcon } from 'lucide-react';
import { toNumber, IVA_RATE } from "@/lib/utils";
import { parseDate } from '@/lib/forms';
import Image from "next/image";
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface ServiceSheetContentProps {
  record: any; // Using `any` because the structure is adapted for public view
  onSignClick?: () => void;
  isSigning?: boolean;
  activeTab: string;
}

export const QuoteContent = React.forwardRef<HTMLDivElement, { quote: QuoteRecord }>(({ quote }, ref) => {
    
    const vehicle = quote.vehicle || null;
    const workshopInfo = quote.workshopInfo || { name: 'Ranoro' };

    const quoteDate = parseDate(quote.serviceDate) || new Date();
    const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

    const items = useMemo(() => (quote?.serviceItems ?? []).map(it => ({
        ...it,
        price: toNumber(it?.price, 0),
    })), [quote?.serviceItems]);

    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = items.reduce((acc, it) => acc + it.price, 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);
    
    const termsText = `Precios en MXN. Esta cotización es válida hasta el ${validityDate}. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Los precios aquí detallados están sujetos a cambios sin previo aviso en caso de variaciones en los costos de los insumos proporcionados por nuestros proveedores, los cuales están fuera de nuestro control.`;

    return (
        <div className="space-y-6" ref={ref}>
            <Card>
                <CardHeader>
                    <CardTitle>Detalles de la Cotización</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={item.id || index} className="p-4 border rounded-lg bg-background">
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
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Asesor de Servicio</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                         {quote.serviceAdvisorSignatureDataUrl && (
                             <div className="p-2 border rounded-md bg-muted/50 flex items-center justify-center min-h-[60px] max-w-[112px] mx-auto">
                                <Image src={quote.serviceAdvisorSignatureDataUrl} alt="Firma del asesor" width={112} height={56} style={{ objectFit: 'contain' }} className="mx-auto" />
                            </div>
                         )}
                         <p className="font-semibold pt-2">{quote.serviceAdvisorName || 'Su asesor de confianza'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Resumen de Costos</CardTitle></CardHeader>
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
                        <Separator className="my-2"/>
                        <p className="text-xs text-muted-foreground pt-2">
                           {termsText}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
});
QuoteContent.displayName = "QuoteContent";


export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ record, onSignClick, isSigning, activeTab }, ref) => {
    
    const {
        id, serviceDate, status, vehicle, customerName, workshopInfo, 
        serviceAdvisorName, serviceItems, quoteItems, reception, delivery, securityChecklist, isPublicView
    } = record;
    
    const effectiveWorkshopInfo = { ...{ name: 'Ranoro' }, ...workshopInfo };
    const formattedServiceDate = serviceDate && isValid(parseDate(serviceDate)!) ? format(parseDate(serviceDate)!, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const isQuote = status === 'Cotizacion' || status === 'Agendado';

    const renderHeader = () => (
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>ORDEN DE SERVICIO</CardTitle>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground">Folio</p>
              <p className="font-semibold">{id}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-semibold">{formattedServiceDate}</p>
            </div>
        </CardHeader>
      </Card>
    );

    const renderClientInfo = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 p-4">
            <User className="w-8 h-8 text-muted-foreground flex-shrink-0"/>
            <div>
              <CardTitle className="text-base">Cliente</CardTitle>
              <CardDescription className="text-xs">Información del propietario</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-semibold">{capitalizeWords(customerName || '')}</p>
            <p className="text-sm text-muted-foreground">{vehicle?.ownerPhone || 'Teléfono no disponible'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 p-4">
             <CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/>
            <div>
              <CardTitle className="text-base">Vehículo</CardTitle>
              <CardDescription className="text-xs">Datos del vehículo</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
             <p className="font-semibold">{vehicle?.label || 'N/A'}</p>
             <p className="text-muted-foreground">{vehicle?.plates || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>
    );

    return (
      <div ref={ref} className="font-sans bg-transparent text-black" data-format="letter">
        <div className="space-y-6">
            {renderHeader()}
            {renderClientInfo()}
            <QuoteContent quote={record} />
        </div>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
