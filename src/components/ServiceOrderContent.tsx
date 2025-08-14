
"use client";

import React, { useMemo } from 'react';
import type { ServiceRecord, WorkshopInfo, Vehicle, ServiceItem } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency, capitalizeWords, formatNumber, getStatusInfo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, FileText, Wrench } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};

const IVA_RATE = 0.16;
const termsText = `Precios en MXN. No incluye trabajos o materiales que no estén especificados explícitamente en la presente cotización. Esta cotización tiene una vigencia de 15 días a partir de su fecha de emisión. Los precios de las refacciones están sujetos a cambios sin previo aviso por parte de los proveedores.`;


const ItemsAndCostSection = ({ items, title = "Trabajos a Realizar" }: { items: ServiceItem[], title?: string }) => {
    const { subTotal, taxAmount, totalCost } = useMemo(() => {
        const total = (items || []).reduce((acc, it) => acc + (Number(it.price) || 0), 0);
        const sub = total / (1 + IVA_RATE);
        const tax = total - sub;
        return { subTotal: sub, taxAmount: tax, totalCost: total };
    }, [items]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(items || []).map((item, index) => (
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
                            {(!items || items.length === 0) && (
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
    );
};

const AdvisorContactCard = ({ workshopInfo, service }: { workshopInfo: WorkshopInfo, service: ServiceRecord }) => (
    <div className="grid grid-cols-1 gap-6 mt-6">
        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center flex-shrink-0">
                    <div className="p-2 bg-white flex items-center justify-center w-48 h-24 border rounded-md">
                      {service.serviceAdvisorSignatureDataUrl ? (
                        <img src={service.serviceAdvisorSignatureDataUrl} alt="Firma del asesor" className="mx-auto object-contain max-h-full max-w-full" />
                      ) : <p className="text-xs text-muted-foreground">Firma no disponible</p>}
                    </div>
                    <p className="font-semibold text-sm mt-2">{service.serviceAdvisorName || 'Asesor no asignado'}</p>
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

export const ServiceOrderContent = React.forwardRef<HTMLDivElement, { service: ServiceRecord, isPublicView?: boolean }>(({ service, isPublicView }, ref) => {
    
    const vehicle = service.vehicle as Vehicle | null;
    const workshopInfo = service.workshopInfo || initialWorkshopInfo;

    const serviceDate = parseDate(service.serviceDate) || new Date();
    const formattedServiceDate = isValid(serviceDate) ? format(serviceDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

    const showTabs = service.status === 'En Taller' || service.status === 'Entregado';
    const hasOriginalQuote = service.originalQuoteItems && service.originalQuoteItems.length > 0;
    
    const { color, icon: IconComponent, label } = getStatusInfo(service.status, service.subStatus);
    
    // Defensive data rendering
    const customerName = capitalizeWords(service.customerName || vehicle?.ownerName || 'Cliente no asignado');
    const customerPhone = vehicle?.ownerPhone || 'Teléfono no disponible';
    const vehicleMake = vehicle?.make || '';
    const vehicleModel = vehicle?.model || '';
    const vehicleYear = vehicle?.year || 'N/A';
    const vehicleLicensePlate = vehicle?.licensePlate || service.vehicleIdentifier || 'N/A';
    const vehicleColor = vehicle?.color;
    const serviceMileage = service?.mileage;

    return (
      <div ref={ref} className="space-y-6">
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
                    <Image src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} />
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-lg">Folio: {service.id}</p>
                  <p className="text-sm text-muted-foreground">{formattedServiceDate}</p>
                </div>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><User className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Cliente</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{customerName}</p><p className="text-sm text-muted-foreground">{customerPhone}</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center gap-4 p-4"><CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0"/><CardTitle className="text-base">Vehículo</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="font-semibold">{vehicleMake} {vehicleModel} ({vehicleYear})</p><p className="text-muted-foreground">{vehicleLicensePlate}</p>{vehicleColor && <p className="text-xs text-muted-foreground">Color: {vehicleColor}</p>}{serviceMileage && <p className="text-xs text-muted-foreground">KM: {formatNumber(serviceMileage)}</p>}</CardContent></Card>
        </div>
        
        {showTabs ? (
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details"><Wrench className="mr-2 h-4 w-4"/>Detalles del Servicio</TabsTrigger>
                    <TabsTrigger value="quote" disabled={!hasOriginalQuote}><FileText className="mr-2 h-4 w-4"/>Cotización Original</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="py-6">
                    <div className="text-center mb-6">
                        <Badge variant={color as any} className="w-full max-w-sm mx-auto justify-center text-base py-2">
                           <IconComponent className="mr-2 h-5 w-5" />
                           {label}
                        </Badge>
                    </div>
                    <ItemsAndCostSection items={service.serviceItems} title="Trabajos Realizados" />
                </TabsContent>
                <TabsContent value="quote" className="py-6">
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-bold tracking-wider text-gray-800 dark:text-gray-200">COTIZACIÓN ORIGINAL ACEPTADA</h2>
                    </div>
                    {hasOriginalQuote ? (
                       <ItemsAndCostSection items={service.originalQuoteItems!} />
                    ) : (
                       <p className="text-center text-muted-foreground py-10">No hay una cotización original guardada para este servicio.</p>
                    )}
                </TabsContent>
            </Tabs>
        ) : (
            <ItemsAndCostSection items={service.serviceItems} />
        )}

        <AdvisorContactCard workshopInfo={workshopInfo} service={service} />
      </div>
    );
});
ServiceOrderContent.displayName = "ServiceOrderContent";
