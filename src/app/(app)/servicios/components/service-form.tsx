/* app/(app)/servicios/components/service-form.tsx */
'use client'

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, Controller, useFieldArray, FormProvider, useFormContext } from "react-hook-form"
import * as z from 'zod'

import Image from 'next/image'
import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import {
  Ban, Camera, CheckCircle, Download, Eye, ShieldCheck, Trash2, Wrench, BrainCircuit, Loader2, PlusCircle, Signature,
  CalendarIcon, Wallet, DollarSign, CalendarCheck, Edit
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { format, setHours, setMinutes, isValid, addDays, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, SafetyInspection, PhotoReportGroup, ServiceItem as ServiceItemType, SafetyCheckValue, InventoryCategory, Supplier, PaymentMethod, Personnel
} from '@/types'

import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { ServiceDetailsCard } from './ServiceDetailsCard'
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { ReceptionAndDelivery } from './ReceptionAndDelivery'
import { SafetyChecklist } from './SafetyChecklist'
import { SignatureDialog } from './signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow'
import { enhanceText } from '@/ai/flows/text-enhancement-flow'
import { PhotoReportTab } from './PhotoReportTab';
import { serviceFormSchema } from '@/schemas/service-form';
import { parseDate } from '@/lib/forms';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { PaymentSection } from '../../pos/components/payment-section';
import Link from 'next/link';
import { Input } from "@/components/ui/input";

/* ░░░░░░  COMPONENTE  ░░░░░░ */
interface Props {
  initialDataService?: ServiceRecord|null
  vehicles:Vehicle[]; 
  technicians: User[];
  inventoryItems:InventoryItem[]
  serviceTypes:ServiceTypeRecord[]
  onSubmit:(d:ServiceRecord|QuoteRecord)=>Promise<void>
  onClose:()=>void
  onCancelService?: (serviceId: string, reason: string) => void;
  isReadOnly?:boolean
  mode?:'service'|'quote'
  onStatusChange?: (status: ServiceRecord['status']) => void;
  onSubStatusChange?: (status: ServiceRecord['subStatus']) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<void>;
  onTotalCostChange: (cost: number) => void;
}

export const ServiceForm = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const {
    initialDataService,
    serviceTypes,
    vehicles:parentVehicles,
    technicians,
    inventoryItems:invItems,
    onSubmit,
    onClose,
    onCancelService,
    isReadOnly = false,
    mode = 'service',
    onStatusChange,
    onSubStatusChange,
    onVehicleCreated,
    onTotalCostChange,
  } = props;

  const { toast } = useToast();
  
  const defaultValues = useMemo<ServiceFormValues>(() => {
    const firstType = serviceTypes[0]?.name ?? 'Servicio General';
    const now = new Date();
    const status = initialDataService?.status ?? (mode === 'quote' ? 'Cotizacion' : 'En Taller');

    if (initialDataService) {
      return {
        ...initialDataService,
        initialStatus: initialDataService.status, // Store initial status
        allVehiclesForDialog: parentVehicles,
        status: status,
        serviceType: initialDataService.serviceType ?? firstType,
        serviceDate: initialDataService.serviceDate ? parseDate(initialDataService.serviceDate) : undefined,
        quoteDate: initialDataService.quoteDate ? parseDate(initialDataService.quoteDate) : (status === 'Cotizacion' ? now : undefined),
        receptionDateTime: initialDataService.receptionDateTime ? parseDate(initialDataService.receptionDateTime) : undefined,
        deliveryDateTime: initialDataService.deliveryDateTime ? parseDate(initialDataService.deliveryDateTime) : undefined,
        customerSignatureReception: initialDataService.customerSignatureReception || null,
        customerSignatureDelivery: initialDataService.customerSignatureDelivery || null,
        technicianName: initialDataService.technicianName || null, 
        serviceAdvisorSignatureDataUrl: initialDataService.serviceAdvisorSignatureDataUrl || '',
        paymentMethod: initialDataService.paymentMethod || 'Efectivo',
        cardFolio: initialDataService.cardFolio || '',
        transferFolio: initialDataService.transferFolio || '',
        nextServiceInfo: initialDataService.nextServiceInfo || undefined,
        mileage: initialDataService.mileage || undefined,
        serviceItems:
          initialDataService.serviceItems?.length
            ? initialDataService.serviceItems
            : [
                {
                  id: nanoid(),
                  name: initialDataService.serviceType ?? firstType,
                  price: initialDataService.totalCost ?? undefined,
                  suppliesUsed: [],
                },
              ],
        photoReports:
          initialDataService.photoReports?.length
            ? initialDataService.photoReports
            : [
                {
                  id: `rep_recepcion_${Date.now()}`,
                  date: now.toISOString(),
                  description: 'Fotografias de la recepcion del vehiculo',
                  photos: [],
                },
              ],
      } as ServiceFormValues;
    }

    const authUser = (() => {
        try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? 'null') as User | null }
        catch { return null }
    })();

    return {
      allVehiclesForDialog: parentVehicles,
      initialStatus: status, // Store initial status for new records
      status: status,
      serviceType: firstType,
      quoteDate: status === 'Cotizacion' ? now : undefined,
      serviceDate: status === 'Agendado' ? now : undefined,
      receptionDateTime: status === 'En Taller' ? now : undefined,
      technicianId: '',
      technicianName: null, 
      customerSignatureReception: null,
      customerSignatureDelivery: null,
      serviceAdvisorSignatureDataUrl: authUser?.signatureDataUrl || '',
      paymentMethod: 'Efectivo',
      cardFolio: '',
      transferFolio: '',
      nextServiceInfo: undefined,
      vehicleId: '',
      mileage: undefined,
      notes: '',
      subStatus: undefined,
      vehicleConditions: '',
      customerItems: '',
      fuelLevel: '',
      serviceItems: [{
        id: nanoid(),
        name: firstType,
        price: undefined,
        suppliesUsed: [],
      }],
      photoReports: [{
        id: `rep_recepcion_${Date.now()}`,
        date: new Date().toISOString(),
        description: 'Fotografias de la recepcion del vehiculo',
        photos: [],
      }],
      serviceAdvisorId: authUser?.id,
      serviceAdvisorName: authUser?.name,
    } as ServiceFormValues;
  }, [initialDataService, serviceTypes, mode, parentVehicles]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues,
  });
  
  const { control, setValue, watch, formState, handleSubmit, reset, getValues } = form;
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  useEffect(() => {
    onTotalCostChange(totalCost);
  }, [totalCost, onTotalCostChange]);

  const watchedStatus = watch('status');
  const watchedSubStatus = watch('subStatus');
  
  useEffect(() => {
    if (onStatusChange) onStatusChange(watchedStatus);
    if (onSubStatusChange) onSubStatusChange(watchedSubStatus);
  }, [watchedStatus, watchedSubStatus, onStatusChange, onSubStatusChange]);
  
  const [activeTab, setActiveTab] = useState('details')
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [signatureType, setSignatureType] = useState<'advisor' | 'reception' | 'delivery' | null>(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    inventoryService.onCategoriesUpdate(setAllCategories);
    inventoryService.onSuppliersUpdate(setAllSuppliers);
  }, []);

  const handleEnhanceText = useCallback(async (fieldName: any) => {
    setIsEnhancingText(fieldName);
    const textToEnhance = getValues(fieldName);
    const contextMap: { [key: string]: string } = {
        notes: "Notas Generales del Servicio",
        vehicleConditions: "Condiciones del Vehículo",
        customerItems: "Pertenencias del Cliente",
        'safetyInspection.inspectionNotes': "Observaciones de Inspección",
    };
    
    let context = "Descripción de Reporte Fotográfico";
    if (typeof fieldName === 'string') {
        context = contextMap[fieldName] || (fieldName.includes('safetyInspection') ? 'Notas de Punto de Revisión' : context);
    }

    try {
        const enhancedText = await enhanceText({ text: textToEnhance, context });
        setValue(fieldName, enhancedText, { shouldDirty: true });
    } catch (e) {
        toast({ title: 'Error de IA', description: 'No se pudo mejorar el texto.', variant: 'destructive' });
    } finally {
        setIsEnhancingText(null);
    }
  }, [getValues, setValue, toast]);

  const handleGenerateQuote = useCallback(async () => {
    setIsGeneratingQuote(true)
    const values = getValues()
    const vehicle = parentVehicles.find(v => v.id === values.vehicleId)
    if (!vehicle) {
      toast({ title: "Vehículo no seleccionado", variant: "destructive" })
      setIsGeneratingQuote(false)
      return
    }
    try {
      const result = await suggestQuote({
        vehicleInfo: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
        serviceDescription: values.serviceItems[0]?.name || '',
        serviceHistory: [],
        inventory: invItems,
      })
      
      const newServiceItems = [{
        id: nanoid(),
        name: values.serviceItems[0]?.name,
        price: result.estimatedTotalCost,
        suppliesUsed: result.suppliesProposed.map(sp => {
          const invItem = invItems.find(i => i.id === sp.supplyId)
          return {
            supplyId: sp.supplyId,
            supplyName: invItem?.name || 'Desconocido',
            quantity: sp.quantity,
            unitPrice: invItem?.unitPrice || 0,
            sellingPrice: invItem?.sellingPrice || 0,
            isService: invItem?.isService,
            unitType: invItem?.unitType,
          }
        }),
      }]
      setValue('serviceItems', newServiceItems)
      setValue('notes', result.reasoning)
      toast({ title: "Cotización Sugerida", description: "La IA ha generado una sugerencia." })
    } catch (e) {
      toast({ title: "Error de IA", variant: "destructive" })
    } finally {
      setIsGeneratingQuote(false)
    }
  }, [getValues, setValue, parentVehicles, invItems, toast])

  const handleVehicleCreated = useCallback(async (newVehicleData: VehicleFormValues) => {
    if (onVehicleCreated) {
      await onVehicleCreated(newVehicleData);
    }
    setIsNewVehicleDialogOpen(false);
  }, [onVehicleCreated]);

  const handleOpenNewVehicleDialog = useCallback((plate?: string) => {
    setNewVehicleInitialPlate(plate);
    setIsNewVehicleDialogOpen(true);
  }, []);

  const handleNewInventoryItemCreated = useCallback(async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    toast({ title: "Producto Creado", description: `"${newItem.name}" ha sido agregado al inventario.` });
    return newItem;
  }, [toast]);
  
  const handlePhotoUploaded = useCallback((reportIndex: number, url: string) => {
    const currentPhotos = getValues(`photoReports.${reportIndex}.photos`) || [];
    setValue(`photoReports.${reportIndex}.photos`, [...currentPhotos, url], { shouldDirty: true });
  }, [getValues, setValue]);

  const handleChecklistPhotoUploaded = useCallback((itemName: string, url: string) => {
      const fieldName: `safetyInspection.${keyof SafetyInspection}` = `safetyInspection.${itemName as keyof SafetyInspection}`;
      const currentCheckValue = getValues(fieldName) as SafetyCheckValue || { status: 'na', photos: [] };
      const updatedPhotos = [...(currentCheckValue.photos || []), url];
      setValue(fieldName, { ...currentCheckValue, photos: updatedPhotos });
  }, [getValues, setValue]);

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleSignatureSave = (signatureDataUrl: string) => {
    if (signatureType) {
        const fieldName: 'serviceAdvisorSignatureDataUrl' | 'customerSignatureReception' | 'customerSignatureDelivery' | null =
            signatureType === 'advisor' ? 'serviceAdvisorSignatureDataUrl' :
            signatureType === 'reception' ? 'customerSignatureReception' :
            signatureType === 'delivery' ? 'customerSignatureDelivery' : null;

        if (!fieldName) return;
        
        const safeValue = signatureDataUrl?.trim() ? signatureDataUrl : null;
        setValue(fieldName, safeValue, { shouldDirty: true });
        setIsSignatureDialogOpen(false);
        setSignatureType(null);
        toast({ title: "Firma capturada correctamente." });
    }
  };

  const formSubmitWrapper = (values: ServiceFormValues) => {
    const dataToSubmit: any = { ...values };
    
    dataToSubmit.totalCost = totalCost;
    dataToSubmit.totalSuppliesWorkshopCost = totalSuppliesWorkshopCost;
    dataToSubmit.serviceProfit = serviceProfit;
    
    const IVA = 0.16;
    dataToSubmit.subTotal = totalCost / (1 + IVA);
    dataToSubmit.taxAmount = totalCost - (totalCost / (1 + IVA));

    // Ensure advisor signature is a data URL if it's a new service
    if (!initialDataService?.id && dataToSubmit.serviceAdvisorSignatureDataUrl && !dataToSubmit.serviceAdvisorSignatureDataUrl.startsWith('data:')) {
        const authUser = JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) || 'null');
        if (authUser?.signatureDataUrl) {
            dataToSubmit.serviceAdvisorSignatureDataUrl = authUser.signatureDataUrl;
        }
    }


    onSubmit(dataToSubmit);
  };
  
  const formTabs = [
      { id: 'details', label: 'Detalles' },
      { id: 'reception', label: 'Ingreso/Salida' },
      { id: 'photoreport', label: 'Fotos' },
      { id: 'checklist', label: 'Revisión' },
  ];


  return (
    <>
        <FormProvider {...form}>
            <form ref={ref} id="service-form" onSubmit={handleSubmit(formSubmitWrapper)} className="flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto px-6 pt-4 space-y-6">
                    <VehicleSelectionCard
                        isReadOnly={props.isReadOnly}
                        localVehicles={parentVehicles}
                        onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
                        onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
                    />

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 -mx-6 px-6 mb-4 border-b flex justify-between items-center">
                            <TabsList className={cn("grid w-full", "grid-cols-4")}>
                                <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
                                <TabsTrigger value="reception" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Recepción/Entrega</TabsTrigger>
                                <TabsTrigger value="photoreport" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fotos</TabsTrigger>
                                <TabsTrigger value="checklist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Revisión</TabsTrigger>
                            </TabsList>
                             <Button type="button" variant="ghost" size="icon" onClick={() => setIsPreviewOpen(true)} title="Vista Previa" className="ml-2">
                                <Eye className="h-5 w-5"/>
                            </Button>
                        </div>
                        <TabsContent value="details" className="mt-0 space-y-4">
                            <ServiceDetailsCard
                                isReadOnly={props.isReadOnly}
                                technicians={technicians}
                                inventoryItems={invItems}
                                serviceTypes={serviceTypes}
                                mode={props.mode || 'service'}
                                onGenerateQuoteWithAI={handleGenerateQuote}
                                isGeneratingQuote={isGeneratingQuote}
                                isEnhancingText={isEnhancingText}
                                handleEnhanceText={handleEnhanceText as any}
                                onNewInventoryItemCreated={handleNewInventoryItemCreated}
                                categories={allCategories}
                                suppliers={allSuppliers}
                            />
                        </TabsContent>
                        <TabsContent value="reception" className="mt-0">
                           <ReceptionAndDelivery 
                             onOpenSignature={(kind) => { setSignatureType(kind); setIsSignatureDialogOpen(true); }}
                             isReadOnly={props.isReadOnly}
                             isEnhancingText={isEnhancingText}
                             handleEnhanceText={handleEnhanceText as any}
                           />
                        </TabsContent>
                        <TabsContent value="photoreport" className="mt-0">
                             <PhotoReportTab
                                isReadOnly={props.isReadOnly}
                                serviceId={initialDataService?.id || 'new'}
                                onPhotoUploaded={handlePhotoUploaded}
                                onViewImage={handleViewImage}
                             />
                        </TabsContent>
                        <TabsContent value="checklist" className="mt-0">
                            <SafetyChecklist
                                serviceId={initialDataService?.id || 'new'}
                                isReadOnly={props.isReadOnly}
                                onSignatureClick={() => { setSignatureType('advisor'); setIsSignatureDialogOpen(true); }}
                                signatureDataUrl={watch('serviceAdvisorSignatureDataUrl')}
                                isEnhancingText={isEnhancingText}
                                handleEnhanceText={handleEnhanceText as any}
                                onPhotoUploaded={handleChecklistPhotoUploaded}
                                onViewImage={handleViewImage}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </form>
        </FormProvider>

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleVehicleCreated}
        vehicle={{ licensePlate: newVehicleInitialPlate }}
      />
      
      <SignatureDialog
        open={isSignatureDialogOpen}
        onOpenChange={setIsSignatureDialogOpen}
        onSave={handleSignatureSave}
      />

       {isPreviewOpen && initialDataService && (
        <UnifiedPreviewDialog
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            service={getValues()}
        />
      )}

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <UiDialogContent className="max-w-4xl p-2">
            <UiDialogHeader className="print:hidden">
                <UiDialogTitle>Vista Previa de Imagen</UiDialogTitle>
                <DialogDescription>Visualización de la imagen adjunta.</DialogDescription>
            </UiDialogHeader>
            <div className="relative aspect-video w-full">
                {viewingImageUrl && (<Image src={viewingImageUrl} alt="Vista ampliada" fill style={{objectFit:"contain"}} sizes="(max-width: 768px) 100vw, 1024px" />)}
            </div>
        </UiDialogContent>
      </Dialog>
    </>
  );
});
ServiceForm.displayName = "ServiceForm";
