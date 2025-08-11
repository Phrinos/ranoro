
"use client";

import type { QuoteRecord, WorkshopInfo } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Icon } from '@iconify/react';


const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};


export const QuoteContent = React.forwardRef<HTMLDivElement, { quote: QuoteRecord }>(({ quote }, ref) => {
    
    const vehicle = quote.vehicle || null;
    const workshopInfo = quote.workshopInfo || { name: 'Ranoro' };
    const IVA_RATE = 0.16;

    const quoteDate = parseDate(quote.serviceDate) || new Date();
    const formattedQuoteDate = isValid(quoteDate) ? format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    const validityDate = isValid(quoteDate) ? format(addDays(quoteDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

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
    
    const termsText = `Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Los precios aquí detallados están sujetos a cambios sin previo aviso en caso de variaciones en los costos de los insumos proporcionados por nuestros proveedores, los cuales están fuera de nuestro control.`;

    return (
      <div ref={ref} className="space-y-6">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-xl">COTIZACION DE SERVICIO</CardTitle>
                </div>
                <div className="text-left sm:text-right text-sm">
                  <p className="text-muted-foreground">Folio</p>
                  <p className="font-semibold">{quote.id}</p>
                </div>
                <div className="text-left sm:text-right text-sm">
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-semibold">{formattedQuoteDate}</p>
                   <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Válida hasta:</span>{' '}
                      <Badge variant="destructive">{validityDate}</Badge>
                   </div>
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
                <p className="font-semibold">{capitalizeWords(quote.customerName || '')}</p>
                <p className="text-sm text-muted-foreground">{quote.customerPhone || 'Teléfono no disponible'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                 <CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/>
                 <CardTitle className="text-base">Vehículo</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="font-semibold">{vehicle?.label || 'N/A'}</p>
                 <p className="text-muted-foreground">{vehicle?.plates || 'N/A'}</p>
              </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Trabajos a realizar</CardTitle>
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
                    </CardContent>
                </Card>
            </div>
        </div>

        <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">Términos y Condiciones</p>
                    <p>{termsText}</p>
                    <div className="flex items-center gap-4 pt-2">
                        <a href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer"><Icon icon="logos:whatsapp-icon" className="h-6 w-6"/></a>
                        <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><Icon icon="logos:facebook" className="h-6 w-6"/></a>
                        <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"><Icon icon="skill-icons:instagram" className="h-6 w-6"/></a>
                        <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><Icon icon="skill-icons:linkedin" className="h-6 w-6"/></a>
                    </div>
                </div>
                <div className="md:col-span-1 flex flex-col items-center text-center">
                    {quote.serviceAdvisorSignatureDataUrl && (
                        <div className="p-2 bg-muted/50 flex items-center justify-center min-h-[60px] w-full max-w-[150px]">
                            <img src={quote.serviceAdvisorSignatureDataUrl} alt="Firma del asesor" className="mx-auto object-contain" />
                        </div>
                    )}
                    <div className="pt-2 border-t border-dashed w-full max-w-[200px]">
                        <p className="font-semibold text-sm">{quote.serviceAdvisorName || 'Su asesor de confianza'}</p>
                        <p className="text-xs text-muted-foreground">ASESOR DE SERVICIO</p>
                    </div>
                </div>
            </CardContent>
             <div className="border-t p-2 text-center text-xs text-muted-foreground space-x-4">
                <Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link>
                <span>|</span>
                <Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link>
            </div>
        </Card>
      </div>
    );
});
QuoteContent.displayName = "QuoteContent";
