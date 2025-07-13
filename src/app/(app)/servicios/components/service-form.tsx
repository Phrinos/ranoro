

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { nanoid } from 'nanoid'
import { useToast } from '@/hooks/use-toast'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Form } from '@/components/ui/form'
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import { SignatureDialog } from './signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { ServiceDetailsCard } from './ServiceDetailsCard'
import { ReceptionAndDelivery } from './ReceptionAndDelivery'
import { SafetyChecklist } from './SafetyChecklist'
import { PhotoUploader } from './PhotoUploader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from "next/image";
import { Eye, Loader2 } from 'lucide-react'
import { Wrench, CheckCircle, ShieldCheck, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useServiceStatusWatcher, useServiceTotals, useInitServiceForm } from '@/hooks/use-service-form-hooks'
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';

import type { Vehicle, Technician, InventoryItem, ServiceTypeRecord, ServiceRecord, QuoteRecord } from '@/types'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form'

interface ServiceFormProps {
  initialDataService?: ServiceRecord | null
  vehicles: Vehicle[]
  technicians: Technician[]
  inventoryItems: InventoryItem[]
  serviceTypes: ServiceTypeRecord[]
  serviceHistory?: ServiceRecord[]
  onSubmit: (data: ServiceRecord | QuoteRecord) => Promise<void>
  onClose: () => void
  isReadOnly?: boolean
  mode?: 'service' | 'quote'
  dialogTitle: string;
  dialogDescription: string;
  children?: React.ReactNode; // For footer actions
}

export function ServiceForm({
  initialDataService,
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  serviceHistory = [],
  onSubmit,
  onClose,
  isReadOnly = false,
  mode = 'service',
  dialogTitle,
  dialogDescription,
  children
}: ServiceFormProps) {
  const { toast } = useToast()
  
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: 'onBlur',
  })
  const { control, handleSubmit, getValues, setValue, watch, formState } = form;

  useInitServiceForm(form, { initData: initialDataService, serviceTypes });
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  const [activeTab, setActiveTab] = useState('servicio');
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>('');
  
  const status = watch('status');
  const serviceId = watch('id') || 'new';

  useEffect(() => {
    if (status === 'En Taller' && !getValues('receptionDateTime')) {
        setValue('receptionDateTime', new Date(), { shouldDirty: true });
    }
  }, [status, getValues, setValue]);

  const handleOpenPreview = () => { setIsPreviewOpen(true); };
  const handleOpenVehicleDialog = () => { setIsVehicleDialogOpen(true); };
  const handleSignatureClick = () => { setIsSignatureDialogOpen(true); };

  const handleSave = (data: ServiceFormValues) => {
    const finalData = { ...data, totalCost, totalSuppliesWorkshopCost, serviceProfit };
    onSubmit(finalData as ServiceRecord);
  };

  const handleEnhanceText = async (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => {
    const currentValue = getValues(fieldName);
    if (!currentValue) return;
    setIsEnhancingText(fieldName);
    try {
        const enhanced = await enhanceText({ text: currentValue, context: "Descripción del Servicio" });
        setValue(fieldName, enhanced, { shouldDirty: true });
        toast({ title: 'Texto mejorado con IA' });
    } catch (e) {
        toast({ title: 'Error de IA', description: 'No se pudo mejorar el texto.', variant: 'destructive' });
    } finally {
        setIsEnhancingText(null);
    }
  };

  const handleGenerateQuote = async () => {
    const vehicleId = getValues('vehicleId');
    const description = getValues('description');
    if (!vehicleId || !description) {
        toast({ title: "Faltan datos", description: "Seleccione un vehículo y añada una descripción del servicio.", variant: "destructive" });
        return;
    }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    setIsGeneratingQuote(true);
    try {
        const result = await suggestQuote({
            vehicleInfo: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
            serviceDescription: description,
            serviceHistory: serviceHistory.map(s => ({
                description: s.description || '', totalCost: s.totalCost || 0,
                suppliesUsed: (s.serviceItems || []).flatMap(i => i.suppliesUsed || []).map(su => ({ supplyName: su.supplyName || '', quantity: su.quantity }))
            })),
            inventory: inventoryItems.map(i => ({ id: i.id, name: i.name, sellingPrice: i.sellingPrice }))
        });

        const newServiceItems = result.suppliesProposed.map(sp => {
            const inventoryItem = inventoryItems.find(i => i.id === sp.supplyId);
            return {
                id: nanoid(), name: inventoryItem?.name || 'Insumo Sugerido', price: inventoryItem?.sellingPrice || 0,
                suppliesUsed: [{ supplyId: sp.supplyId, supplyName: inventoryItem?.name || '', quantity: sp.quantity, unitPrice: inventoryItem?.unitPrice || 0, sellingPrice: inventoryItem?.sellingPrice || 0, unitType: inventoryItem?.unitType || 'units' }]
            };
        });
        setValue('serviceItems', newServiceItems as any);
        setValue('totalCost', result.estimatedTotalCost, { shouldDirty: true });
        toast({ title: "Cotización Sugerida por IA", description: result.reasoning, duration: 6000 });

    } catch (e: any) {
        toast({ title: "Error al generar cotización", description: e.message, variant: "destructive" });
    } finally {
        setIsGeneratingQuote(false);
    }
  };

  const handlePhotoUpload = useCallback((reportIndex: number, url: string) => {
    const photoReports = getValues('photoReports') || [];
    const currentReport = photoReports[reportIndex];
    if (currentReport) {
        const updatedPhotos = [...(currentReport.photos || []), url];
        setValue(`photoReports.${index}.photos`, updatedPhotos, { shouldDirty: true });
    }
  }, [getValues, setValue]);

  const handleViewImage = useCallback((url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  }, []);
  
  const showAdvancedTabs = status && ['En Taller', 'Entregado', 'Cancelado'].includes(status);
  const tabs = [
    { value: 'servicio', label: 'Detalles', icon: Wrench, show: true },
    { value: 'recepcion', label: 'Rec./Ent.', icon: CheckCircle,  show: showAdvancedTabs },
    { value: 'reporte', label: 'Fotos', icon: Camera, show: showAdvancedTabs },
    { value: 'seguridad', label: 'Revisión',   icon: ShieldCheck,  show: showAdvancedTabs },
  ].filter((t) => t.show);
  
  const gridColsClass = `grid-cols-${tabs.length}`;

  return (
    <>
      <DialogHeader className="p-6 pb-2">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
      </DialogHeader>

      <div className="border-b px-6 pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center">
              <TabsList className={cn('grid w-full mb-0', gridColsClass)}>
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm flex items-center gap-2">
                    <t.icon className="h-4 w-4 mr-1.5 shrink-0" />
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.label.slice(0, 5)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {!isReadOnly && ( <Button type="button" onClick={handleOpenPreview} variant="ghost" size="icon" title="Vista previa"><Eye className="h-5 w-5" /></Button>)}
            </div>
          </Tabs>
      </div>
      
      <Form {...form}>
        <form id="service-form" onSubmit={handleSubmit(handleSave)}>
          {/* Main content is now inside the ServiceForm component */}
        </form>
      </Form>
      
      <div className="flex-grow overflow-y-auto px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="servicio" className="mt-6">
                <Card className="shadow-none border-none p-0"><CardContent className="p-0 space-y-6">
                    <VehicleSelectionCard isReadOnly={isReadOnly} localVehicles={vehicles} serviceHistory={serviceHistory} onVehicleSelected={() => {}} onOpenNewVehicleDialog={handleOpenVehicleDialog} />
                    <ServiceDetailsCard isReadOnly={isReadOnly} technicians={technicians} inventoryItems={inventoryItems} serviceTypes={serviceTypes} mode={mode} totalCost={totalCost} totalSuppliesWorkshopCost={totalSuppliesWorkshopCost} serviceProfit={serviceProfit} onGenerateQuoteWithAI={handleGenerateQuote} isGeneratingQuote={isGeneratingQuote} />
                </CardContent></Card>
            </TabsContent>
            <TabsContent value="recepcion" className="mt-6"><ReceptionAndDelivery control={control} isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} /></TabsContent>
            <TabsContent value="reporte" className="mt-6"><PhotoReportTab control={control} isReadOnly={isReadOnly} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} serviceId={serviceId} onPhotoUploaded={handlePhotoUpload} onViewImage={handleViewImage} /></TabsContent>
            <TabsContent value="seguridad" className="mt-6"><SafetyChecklist control={control} isReadOnly={isReadOnly} onSignatureClick={handleSignatureClick} signatureDataUrl={watch('safetyInspection.technicianSignature')} isEnhancingText={isEnhancingText} handleEnhanceText={handleEnhanceText} serviceId={serviceId} onPhotoUploaded={(itemName, urls) => { const currentVal = getValues(`safetyInspection.${itemName as keyof ServiceFormValues['safetyInspection']}`); setValue(`safetyInspection.${itemName as keyof ServiceFormValues['safetyInspection']}`, { ...(currentVal || { status: 'na' }), photos: [...(currentVal?.photos || []), ...urls] }, { shouldDirty: true }); }} onViewImage={handleViewImage} /></TabsContent>
        </Tabs>
      </div>
      
      <DialogFooter className="p-6 pt-4 border-t">
          {children}
      </DialogFooter>

      <VehicleDialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen} onSave={(data) => { console.log("New vehicle data:", data); setIsVehicleDialogOpen(false); }} />
      <SignatureDialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen} onSave={(sig) => { setValue('safetyInspection.technicianSignature', sig, { shouldDirty: true }); setIsSignatureDialogOpen(false); }} />
      <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={getValues() as ServiceRecord} vehicle={vehicles.find(v => v.id === watch('vehicleId'))} />
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2"><div className="relative aspect-video w-full"><Image src={viewingImageUrl || ''} alt="Vista ampliada" fill className="object-contain" /></div></DialogContent>
      </Dialog>
    </>
  )
}

// Separate component for the Photo Report Tab
const PhotoReportTab = ({ control, isReadOnly, isEnhancingText, handleEnhanceText, serviceId, onPhotoUploaded, onViewImage }: any) => {
    const { fields, append, remove } = useFieldArray({ control, name: 'photoReports' });
    const { watch } = useFormContext();
    return (
        <Card>
            <CardHeader><CardTitle>Reporte Fotográfico</CardTitle><CardDescription>Documenta el proceso con imágenes. Puedes crear varios reportes.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                {fields.map((report, index) => (
                     <Card key={report.id} className="p-4 bg-muted/30">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">Reporte #{index + 1}</h4>
                            {!isReadOnly && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                        </div>
                        <div className="space-y-4">
                            <FormField control={control} name={`photoReports.${index}.description`} render={({ field }) => (
                                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Describa el propósito de estas fotos..." {...field} disabled={isReadOnly}/></FormControl></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {watch(`photoReports.${index}.photos`)?.map((photoUrl: string, photoIndex: number) => (
                                    <div key={photoIndex} className="relative aspect-video bg-muted rounded-md overflow-hidden group">
                                        <Image src={photoUrl} alt={`Foto ${photoIndex + 1}`} layout="fill" objectFit="cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button variant="ghost" size="icon" onClick={() => onViewImage(photoUrl)} className="text-white hover:bg-white/20 hover:text-white"><Eye/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <PhotoUploader reportIndex={index} serviceId={serviceId} onUploadComplete={onPhotoUploaded} photosLength={watch(`photoReports.${index}.photos`)?.length || 0} disabled={isReadOnly} maxPhotos={3}/>
                        </div>
                     </Card>
                ))}
                {!isReadOnly && <Button type="button" variant="outline" onClick={() => append({ id: `rep_${Date.now()}`, date: new Date().toISOString(), description: '', photos: []})}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Reporte</Button>}
            </CardContent>
        </Card>
    );
}

