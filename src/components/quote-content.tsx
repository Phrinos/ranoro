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

// --- SVG Icons for Social Media ---
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M15.5 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"/>
        <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s8.59 3.17 9.82 7.55"/>
        <path d="M15 12a3 3 0 0 0-3-3"/>
    </svg>
);
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
);


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
                             <div className="p-2 border rounded-md bg-muted/50 flex items-center justify-center min-h-[60px] max-w-[150px] mx-auto">
                                <Image src={quote.serviceAdvisorSignatureDataUrl} alt="Firma del asesor" width={150} height={75} style={{ objectFit: 'contain' }} className="mx-auto" />
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
                    <p className="text-lg font-semibold flex items-center justify-center gap-2 mt-2"><Phone className="h-5 w-5"/> {workshopInfo.phone || '4491425323'}</p>
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <Link href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer" title="WhatsApp">
                            <WhatsAppIcon className="h-7 w-7 text-gray-600 hover:text-green-500 transition-colors"/>
                        </Link>
                        <Link href="https://share.google/9RX1vzp5fAnam7PWy" target="_blank" rel="noopener noreferrer" title="Google">
                             <GoogleIcon className="h-6 w-6 text-gray-600 hover:text-blue-600 transition-colors"/>
                        </Link>
                        <Link href="https://maps.app.goo.gl/dCixrtimpLDRakCC9" target="_blank" rel="noopener noreferrer" title="Google Maps">
                            <MapPin className="h-7 w-7 text-gray-600 hover:text-red-500 transition-colors"/>
                        </Link>
                         <Link href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Facebook">
                            <FacebookIcon className="h-7 w-7 text-gray-600 hover:text-blue-800 transition-colors"/>
                        </Link>
                        <Link href="https://www.instagram.com/ranoromx/" target="_blank" rel="noopener noreferrer" title="Instagram">
                           <InstagramIcon className="h-7 w-7 text-gray-600 hover:text-pink-500 transition-colors"/>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});

QuoteContent.displayName = "QuoteContent";
