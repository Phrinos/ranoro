
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
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.75 13.96c.25.13.43.2.6.33.2.14.38.3.52.48.14.2.22.4.28.6.07.2.07.4.03.6s-.1.4-.18.54c-.1.14-.2.25-.33.35-.14.1-.28.18-.43.24-.15.05-.3.1-.46.12-.2.02-.4.02-.6.02-.23 0-.48-.02-.73-.06-.25-.04-.5-.1-.75-.2-.25-.08-.5-.2-.74-.32-.25-.13-.48-.26-.7-.42-.23-.15-.45-.33-.66-.5-.2-.18-.4-.36-.58-.57-.17-.2-.34-.4-.5-.62-.15-.22-.28-.45-.4-.7-.1-.24-.2-.5-.28-.75-.08-.25-.13-.5-.16-.75-.03-.25-.04-.5-.04-.75s.02-.48.06-.73c.04-.25.1-.5.2-.74.08-.25.2-.5.32-.7.13-.23.26-.45.42-.66.15-.2.33-.4.5-.58.18-.17.36-.34.57-.5.2-.15.4-.28.62-.4.22-.1.45-.2.7-.28.25-.08.5-.13.75-.16.25-.03.5-.04.75-.04s.48.02.73.06c.25.04.5.1.74.2.25.08.5.2.7.32.23.13.45.26.66.42.2.15.4.33.58.5.17.2.34.4.5.62.15.22.28.45.4.7.1.24.2.5.28.75.08.25.13.5.16.75.03.25.04.5.04.75s-.02.48-.06.73c-.04.25-.1.5-.2.74-.08.25-.2.5-.32.7a3.5 3.5 0 01-.42.66c-.15.2-.33.4-.5.58-.18.17-.36.34-.57.5a4.2 4.2 0 01-.62.4zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm3.3 14.2c-.2-.1-.4-.2-.6-.3-.2-.1-.4-.2-.6-.4-.2-.1-.3-.2-.5-.4-.2-.2-.3-.4-.4-.6-.1-.2-.2-.4-.2-.6s0-.4.1-.6c0-.2.1-.4.1-.5.1-.1.2-.3.3-.4.1-.1.2-.2.4-.3.2-.1.4-.2.6-.2.2 0 .4 0 .6.1.2.1.4.1.5.2.1.1.3.2.4.3.1.1.2.3.3.4.1.1.2.3.2.5.1.2.1.4.1.6.1.2.1.4.1.6s-.1.4-.1.6c0 .2-.1.4-.2.5a2.5 2.5 0 01-.3.4c-.1.1-.2.2-.4.3-.1.1-.3.2-.4.3-.1.1-.3.2-.4.2h-.1c-.2 0-.4 0-.6-.1zm-6.6 0c-.2-.1-.4-.2-.6-.3-.2-.1-.4-.2-.6-.4-.2-.1-.3-.2-.5-.4-.2-.2-.3-.4-.4-.6-.1-.2-.2-.4-.2-.6s0-.4.1-.6c0-.2.1-.4.1-.5.1-.1.2-.3.3-.4.1-.1.2-.2.4-.3.2-.1.4-.2.6-.2.2 0 .4 0 .6.1.2.1.4.1.5.2.1.1.3.2.4.3.1.1.2.3.3.4.1.1.2.3.2.5.1.2.1.4.1.6.1.2.1.4.1.6s-.1.4-.1.6c0 .2-.1.4-.2.5a2.5 2.5 0 01-.3.4c-.1.1-.2.2-.4.3-.1.1-.3.2-.4.3-.1.1-.3.2-.4.2h-.1c-.2 0-.4 0-.6-.1z"/>
  </svg>
);
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 488 512" fill="currentColor" {...props}>
        <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.2 69.2c-20.3-19.6-48.8-31.8-79.7-31.8-62.3 0-113.5 51.6-113.5 115.6s51.2 115.6 113.5 115.6c69.2 0 98.6-46.4 103.3-72.2h-103.3v-91.1h199.1c1.2 10.8 1.8 22.3 1.8 34.9z"/>
    </svg>
);
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2.04c-5.5 0-10 4.49-10 10s4.5 10 10 10c5.51 0 10-4.49 10-10s-4.49-10-10-10zm2.23 10.39h-1.63v4.95h-2.2v-4.95h-1.07v-1.91h1.07v-1.28c0-1.08.65-1.65 1.6-1.65h1.34v1.9h-.96c-.52 0-.62.25-.62.6v1.43h1.58l-.21 1.91z"/>
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
                    <p className="text-muted-foreground">¡Gracias por su preferencia!</p>
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
