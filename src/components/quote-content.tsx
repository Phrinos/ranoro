
// src/components/quote-content.tsx

"use client";

import type { QuoteRecord, Vehicle, WorkshopInfo } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Signature, Loader2, Phone, MapPin } from 'lucide-react';
import { formatCurrency, toNumber, IVA_RATE, capitalizeWords } from "@/lib/utils";
import { parseDate } from '@/lib/forms';
import Image from "next/image";
import Link from 'next/link';
import { Icon } from '@iconify/react';


interface QuoteContentProps {
  quote: QuoteRecord;
  isPublicView?: boolean;
  onSignClick?: () => void;
  isSigning?: boolean;
}

export const QuoteContent = React.forwardRef<HTMLDivElement, QuoteContentProps>(
  ({ quote, isPublicView, onSignClick, isSigning }, ref) => {
    
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
            
             <Card>
                <CardContent className="p-6 text-center">
                    <p>¡Gracias por su preferencia!</p>
                    <p className="text-sm mt-1">Para dudas o aclaraciones, no dude en contactarnos.</p>
                    <a href={`tel:${workshopInfo.phone || '4491425323'}`} className="text-lg font-semibold flex items-center justify-center gap-2 mt-2 text-primary hover:underline">
                        <Icon icon="solar:phone-bold" className="h-5 w-5"/>
                        <span>{workshopInfo.phone || '4491425323'}</span>
                    </a>
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <Link href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer" title="WhatsApp">
                            <Icon icon="logos:whatsapp-icon" className="h-7 w-7 transition-transform hover:scale-110"/>
                        </Link>
                        <Link href="https://share.google/9RX1vzp5fAnam7PWy" target="_blank" rel="noopener noreferrer" title="Google">
                             <Icon icon="flat-color-icons:google" className="h-7 w-7 transition-transform hover:scale-110"/>
                        </Link>
                        <Link href="https://maps.app.goo.gl/dCixrtimpLDRakCC9" target="_blank" rel="noopener noreferrer" title="Google Maps">
                            <Icon icon="logos:google-maps" className="h-7 w-7 transition-transform hover:scale-110"/>
                        </Link>
                         <Link href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Facebook">
                            <Icon icon="logos:facebook" className="h-7 w-7 transition-transform hover:scale-110"/>
                        </Link>
                        <Link href="https://www.instagram.com/ranoromx/" target="_blank" rel="noopener noreferrer" title="Instagram">
                           <Icon icon="skill-icons:instagram" className="h-7 w-7 transition-transform hover:scale-110"/>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});

QuoteContent.displayName = "QuoteContent";
