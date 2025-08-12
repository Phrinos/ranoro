
"use client";

import type { QuoteRecord, WorkshopInfo, Vehicle } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, formatCurrency, capitalizeWords, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon } from 'lucide-react';
import { parseDate } from '@/lib/forms';
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

export const QuoteContent = React.forwardRef<HTMLDivElement, { quote: QuoteRecord }>(({ quote }, ref) => {
    
    const vehicle = quote.vehicle as Vehicle | null || null;
    const workshopInfo = quote.workshopInfo || initialWorkshopInfo;
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
    
    const termsText = `Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización...`;

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
                  {vehicle?.color && <p className="text-xs text-muted-foreground">Color: {vehicle.color}</p>}
                  {vehicle?.currentMileage && <p className="text-xs text-muted-foreground">KM: {formatNumber(vehicle.currentMileage)}</p>}
              </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader className="p-3 bg-muted/50 text-center">
                <CardTitle className="text-lg font-bold tracking-wider">COTIZACION DE SERVICIO</CardTitle>
            </CardHeader>
        </Card>
        
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
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
                    <div className="text-center md:text-left">
                        <h3 className="text-lg font-bold">¡Gracias por su preferencia!</h3>
                        <p className="text-muted-foreground mt-1">Para dudas o aclaraciones, no dude en contactarnos.</p>
                         <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                            <Badge className="mt-4 bg-green-100 text-green-800 text-base py-2 px-4 hover:bg-green-200">
                               <Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2"/> {workshopInfo.phone}
                            </Badge>
                         </a>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                 <CardContent className="p-4 flex flex-col justify-center h-full">
                    <div className="flex justify-around items-center">
                        <a href={workshopInfo.googleMapsUrl || "https://www.ranoro.mx"} target="_blank" rel="noopener noreferrer" title="Sitio Web"><Icon icon="mdi:web" className="h-7 w-7 text-muted-foreground hover:text-primary"/></a>
                        <a href={`https://wa.me/${(workshopInfo.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"><Icon icon="logos:whatsapp-icon" className="h-7 w-7"/></a>
                        <a href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Facebook"><Icon icon="logos:facebook" className="h-7 w-7"/></a>
                        <a href="https://www.instagram.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Instagram"><Icon icon="skill-icons:instagram" className="h-7 w-7"/></a>
                    </div>
                    <Separator className="my-3"/>
                    <div className="text-xs text-muted-foreground text-center space-x-2">
                        <Link href="/legal/terminos" target="_blank" className="hover:underline">Términos y Condiciones</Link>
                        <span>|</span>
                        <Link href="/legal/privacidad" target="_blank" className="hover:underline">Aviso de Privacidad</Link>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>
    );
});
QuoteContent.displayName = "QuoteContent";


    