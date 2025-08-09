// src/components/quote-content.tsx

"use client";

import type { QuoteRecord, Vehicle, WorkshopInfo } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Signature, Loader2, Phone } from 'lucide-react';
import { formatCurrency, toNumber, IVA_RATE, capitalizeWords, normalizeDataUrl } from "@/lib/utils";
import { parseDate } from '@/lib/forms';
import Image from "next/image";
import Link from 'next/link';

interface QuoteContentProps {
  quote: QuoteRecord;
  isPublicView?: boolean;
  onSignClick?: () => void;
  isSigning?: boolean;
}

export const QuoteContent = React.forwardRef<HTMLDivElement, QuoteContentProps>(
  ({ quote, isPublicView, onSignClick, isSigning }, ref) => {
    
    // Fallback for embedded data in public view
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
                    <CardDescription>
                        Esta cotización es válida hasta el {validityDate}. Los precios incluyen IVA.
                    </CardDescription>
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
                             <div className="p-2 border rounded-md bg-muted/50 flex items-center justify-center min-h-[100px]">
                                <Image src={normalizeDataUrl(quote.serviceAdvisorSignatureDataUrl)} alt="Firma del asesor" width={200} height={100} style={{ objectFit: 'contain' }} className="mx-auto" />
                            </div>
                         )}
                         <p className="font-semibold pt-2">{quote.serviceAdvisorName || 'Su asesor de confianza'}</p>
                         <Separator />
                         <p className="text-sm text-muted-foreground">¡Gracias por su preferencia!</p>
                         <p className="text-xs">Para dudas o aclaraciones, no dude en contactarnos.</p>
                         <p className="text-sm font-semibold flex items-center justify-center gap-2"><Phone className="h-4 w-4"/> {workshopInfo.phone || '4491234567'}</p>
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
                        <div className="flex justify-between items-center font-bold text-lg">
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

            <Card>
                <CardHeader>
                    <CardTitle>Aprobación del Cliente</CardTitle>
                    <CardDescription>
                        Si está de acuerdo con esta cotización, por favor firme a continuación para autorizar el trabajo.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                    {quote.customerSignatureReception ? (
                        <div className="p-4 border rounded-md bg-muted/50">
                            <Image src={normalizeDataUrl(quote.customerSignatureReception)} alt="Firma de autorización" width={300} height={150} style={{ objectFit: 'contain' }} className="mx-auto" />
                            <p className="text-xs text-green-600 font-semibold mt-2">Trabajo Autorizado</p>
                        </div>
                    ) : isPublicView && onSignClick ? (
                        <Button onClick={onSignClick} disabled={isSigning} className="w-full sm:w-auto">
                            {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                            Firmar y Autorizar Trabajos
                        </Button>
                    ) : (
                        <p className="text-muted-foreground py-8">Firma pendiente.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});

QuoteContent.displayName = "QuoteContent";
