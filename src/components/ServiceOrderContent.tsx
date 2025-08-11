
      
"use client";

import type { QuoteRecord, WorkshopInfo, Vehicle } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import { cn, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, Signature } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};

interface ServiceOrderContentProps {
  service: QuoteRecord; // Re-using QuoteRecord as it has the needed fields
  onSignClick?: () => void;
}

export const ServiceOrderContent = React.forwardRef<HTMLDivElement, ServiceOrderContentProps>(({ service, onSignClick }, ref) => {
    
    const vehicle = service.vehicle || null;
    const workshopInfo = service.workshopInfo || initialWorkshopInfo;
    const isQuoteOrScheduled = service.status === 'Cotizacion' || service.status === 'Agendado';
    const [activeTab, setActiveTab] = useState(isQuoteOrScheduled ? "original" : "detalles");
    const IVA_RATE = 0.16;

    const quoteDate = parseDate(service.serviceDate) || new Date();
    const formattedQuoteDate = isValid(quoteDate) ? format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const items = useMemo(() => (service?.serviceItems ?? []).map(it => ({
        ...it,
        price: Number(it?.price) || 0,
    })), [service?.serviceItems]);

    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = items.reduce((acc, it) => acc + it.price, 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);
    
    const originalItems = useMemo(() => (service?.originalQuoteItems ?? service.serviceItems ?? []).map(it => ({
        ...it,
        price: Number(it?.price) || 0,
    })), [service?.originalQuoteItems, service?.serviceItems]);

    return (
      <div ref={ref} className="space-y-6">
        {onSignClick && (
             <Alert className="border-blue-500 bg-blue-50 text-blue-800 flex items-center justify-between">
                <div>
                    <AlertDescription className="font-medium">
                        Tu vehículo ya está en el taller. Por favor, autoriza los trabajos firmando la orden de servicio.
                    </AlertDescription>
                </div>
                <Button onClick={onSignClick} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Signature className="mr-2 h-4 w-4"/> Firmar para Autorizar
                </Button>
            </Alert>
        )}
        
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
                    <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" />
                </div>
                <div className="text-left sm:text-right">
                    <h1 className="text-lg font-bold">Folio: {service.id}</h1>
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
                <p className="font-semibold">{capitalizeWords(service.customerName || '')}</p>
                <p className="text-sm text-muted-foreground">{service.customerPhone || 'Teléfono no disponible'}</p>
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="original">Cotización</TabsTrigger>
                <TabsTrigger value="detalles">Detalles del Servicio</TabsTrigger>
                <TabsTrigger value="revision">Revisión de Seguridad</TabsTrigger>
            </TabsList>
            <TabsContent value="original">
                 <Card>
                    <CardHeader>
                        <CardTitle>Trabajos a realizar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                             {originalItems.map((item, index) => (
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
                            {originalItems.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">No hay trabajos en la cotización original.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="detalles">
                 <Card>
                    <CardHeader>
                        <CardTitle>Trabajos y Ajustes Finales</CardTitle>
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
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="revision">
                 <Card>
                    <CardHeader><CardTitle>Resultados de la Revisión de Seguridad</CardTitle></CardHeader>
                    <CardContent><p className="text-muted-foreground text-center">Contenido de revisión de seguridad próximamente.</p></CardContent>
                </Card>
            </TabsContent>
        </Tabs>

      </div>
    );
});
ServiceOrderContent.displayName = "ServiceOrderContent";


    
