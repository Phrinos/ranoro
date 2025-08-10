
"use client";

import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo, SafetyInspection, SafetyCheckStatus, PhotoReportGroup, Driver } from '@/types';
import { format, isValid, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Signature, Loader2, Phone, MapPin } from 'lucide-react';
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
    const formattedServiceDate = serviceDate && isValid(parseDate(serviceDate)) ? format(parseDate(serviceDate)!, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';
    
    const isQuote = status === 'Cotizacion' || status === 'Agendado';

    const renderHeader = () => (
        <header className="mb-4 pb-4 border-b-2 border-primary">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-[180px] h-[60px] flex-shrink-0">
                    {effectiveWorkshopInfo.logoUrl && (
                        <Image src={effectiveWorkshopInfo.logoUrl} alt={`${effectiveWorkshopInfo.name} Logo`} fill style={{objectFit: 'contain'}} data-ai-hint="workshop logo" priority />
                    )}
                </div>
                <div className="text-left sm:text-right">
                    <h1 className="text-2xl font-bold text-primary">{isQuote ? 'COTIZACIÓN' : 'ORDEN DE SERVICIO'}</h1>
                    <p className="font-mono text-base">Folio: <span className="font-semibold">{id}</span></p>
                    <p className="text-sm">Fecha: <span className="font-semibold">{formattedServiceDate}</span></p>
                </div>
            </div>
        </header>
    );

    const renderClientInfo = () => (
        <Card>
            <Tabs defaultValue="cliente" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cliente">Datos del Cliente</TabsTrigger>
                    <TabsTrigger value="vehiculo">Datos del Vehículo</TabsTrigger>
                </TabsList>
                <TabsContent value="cliente" className="p-6">
                    <CardTitle className="mb-2">Cliente</CardTitle>
                    <p className="font-semibold">{capitalizeWords(customerName || '')}</p>
                </TabsContent>
                <TabsContent value="vehiculo" className="p-6">
                    <CardTitle className="mb-2">Vehículo</CardTitle>
                    <p className="font-semibold">{vehicle?.label || 'N/A'}</p>
                    <p className="text-muted-foreground">{vehicle?.plates || 'N/A'}</p>
                </TabsContent>
            </Tabs>
        </Card>
    );

    return (
      <div ref={ref} className="font-sans bg-white text-black p-4 sm:p-8" data-format="letter">
        {renderHeader()}
        <div className="space-y-6 mt-6">
            {renderClientInfo()}
            <QuoteContent quote={record} />
        </div>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";

```
- src/app/(app)/servicios/[id]/page.tsx</file>
    <content><![CDATA[
// src/app/(app)/servicios/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { serviceService, inventoryService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { ServiceForm } from '../components/ServiceForm';
import type { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier, QuoteRecord } from '@/types'; 
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import type { ServiceFormValues } from '@/schemas/service-form';
import { PageHeader } from '@/components/page-header';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

export default function ServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams()
  const serviceId = params.id as string | undefined;

  const [initialData, setInitialData] = useState<ServiceRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  
  const isEditMode = serviceId !== 'nuevo';
  const isQuoteModeParam = searchParams.get('mode') === 'quote';

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
              vehiclesData, usersData, inventoryData,
              serviceTypesData, categoriesData, suppliersData, allServicesData
            ] = await Promise.all([
              inventoryService.onVehiclesUpdatePromise(),
              adminService.onUsersUpdatePromise(),
              inventoryService.onItemsUpdatePromise(),
              inventoryService.onServiceTypesUpdatePromise(),
              inventoryService.onCategoriesUpdatePromise(),
              inventoryService.onSuppliersUpdatePromise(),
              serviceService.onServicesUpdatePromise(),
            ]);
            
            setVehicles(vehiclesData);
            setUsers(usersData);
            setInventoryItems(inventoryData);
            setServiceTypes(serviceTypesData);
            setCategories(categoriesData);
            setSuppliers(suppliersData);
            setServiceHistory(allServicesData);
            
            if (isEditMode && serviceId) {
                const serviceData = await serviceService.getDocById('serviceRecords', serviceId);
                if (!serviceData) {
                  toast({ title: 'Error', description: 'Servicio no encontrado.', variant: 'destructive' });
                  router.push('/servicios/historial');
                  return;
                }
                setInitialData(serviceData);
            } else {
                const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
                const currentUser = authUserString ? JSON.parse(authUserString) : null;

                setInitialData({
                    status: 'Cotizacion',
                    serviceDate: new Date(),
                    ...(currentUser && {
                        serviceAdvisorId: currentUser.id,
                        serviceAdvisorName: currentUser.name,
                        serviceAdvisorSignatureDataUrl: currentUser.signatureDataUrl,
                    }),
                } as ServiceRecord);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: 'Error', description: 'No se pudieron cargar los datos.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [serviceId, isEditMode, isQuoteModeParam, router, toast]);

  const handleSaveService = async (values: ServiceFormValues) => {
    try {
      const savedRecord = await serviceService.saveService(values as ServiceRecord);
      toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id.slice(-6)} se ha guardado.` });
      
      const targetTab = savedRecord.status === 'Cotizacion' ? 'cotizaciones' : 'activos';
      router.push(`/servicios?tab=${targetTab}`);
        
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    }
  };

  const handleUpdateService = async (values: ServiceFormValues) => {
    if (!initialData) return;
    try {
      await serviceService.saveService({ ...values, id: serviceId });
      toast({ title: 'Servicio Actualizado', description: `El registro #${serviceId?.slice(-6)} ha sido actualizado.` });
      router.push(`/servicios?tab=activos`);
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Actualizar', variant: 'destructive'});
    }
  };
  
  const handleVehicleCreated = async (data: VehicleFormValues) => {
      await inventoryService.addVehicle(data);
      toast({ title: "Vehículo Creado" });
  };

  const handleCancelService = async (id: string, reason: string) => {
      await serviceService.cancelService(id, reason);
      toast({ title: "Servicio Cancelado" });
      router.push('/servicios?tab=historial');
  };
  
  const handleDeleteQuote = async (id: string) => {
      await serviceService.deleteService(id);
      toast({ title: "Cotización Eliminada", variant: "destructive" });
      router.push('/servicios?tab=cotizaciones');
  };
  
  if (isLoading || (isEditMode && !initialData)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        {isEditMode ? 'Cargando servicio...' : 'Cargando...'}
      </div>
    );
  }

  const isQuote = initialData?.status === 'Cotizacion' || isQuoteModeParam;
  
  const pageTitle = isEditMode 
    ? `Editar ${initialData?.status === 'Cotizacion' ? 'Cotización' : 'Servicio'} #${initialData?.id?.slice(-6)}`
    : `Nueva ${isQuote ? 'Cotización' : 'Servicio'}`;
    
  const pageDescription = isEditMode 
    ? `Modifica los detalles para el vehículo ${initialData?.vehicleIdentifier || ''}.`
    : "Completa los datos para crear un nuevo registro.";


  return (
    <>
      <PageHeader title={pageTitle} description={pageDescription} />
      <ServiceForm
        initialData={initialData}
        vehicles={vehicles}
        technicians={users}
        inventoryItems={inventoryItems}
        serviceTypes={serviceTypes}
        categories={categories}
        suppliers={suppliers}
        serviceHistory={serviceHistory}
        onSave={isEditMode ? handleUpdateService : handleSaveService}
        onDelete={handleDeleteQuote}
        onCancelService={handleCancelService}
        onVehicleCreated={handleVehicleCreated}
        mode={isQuote ? 'quote' : 'service'}
      />
    </>
  );
}
