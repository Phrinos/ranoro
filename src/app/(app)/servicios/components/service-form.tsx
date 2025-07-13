

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { nanoid } from 'nanoid'
import { useToast } from '@/hooks/use-toast'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { Form } from '@/components/ui/form'
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import { SignatureDialog } from './signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { ServiceDetailsCard } from './ServiceDetailsCard'
import { ReceptionAndDelivery } from './ReceptionAndDelivery'
import { SafetyChecklist } from './SafetyChecklist'
import { PhotoUploader } from './PhotoUploader'

import { ServiceFormHeader, ServiceFormFooter } from './ServiceFormLayout';
import { useServiceStatusWatcher, useServiceTotals, useInitServiceForm } from '@/hooks/use-service-form-hooks'
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';

import type { Vehicle, Technician, InventoryItem, ServiceTypeRecord, ServiceRecord, QuoteRecord, PhotoReportGroup } from '@/types'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Image from "next/image";
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Eye, PlusCircle, Trash2 } from 'lucide-react'

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
  onVehicleCreated?: (newVehicle: Omit<Vehicle, 'id'>) => void
  mode?: 'service' | 'quote'
  onDelete?: (id: string) => void
  onCancelService?: (id: string, reason: string) => void
  onStatusChange?: (s?: ServiceRecord['status']) => void
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
  onVehicleCreated,
  mode = 'service',
  onDelete,
  onCancelService,
  onStatusChange,
}: ServiceFormProps) {
  const { toast } = useToast()
  
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: 'onBlur',
  })
  const { control, handleSubmit, getValues, setValue, watch, formState } = form;

  // Initialize form with default or existing data
  useInitServiceForm(form, { initData: initialDataService, serviceTypes });

  // Custom hooks for form logic
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  useServiceStatusWatcher(form, onStatusChange);

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
    // Set reception date only the first time status changes to 'En Taller'
    if (status === 'En Taller' && !getValues('receptionDateTime')) {
        setValue('receptionDateTime', new Date(), { shouldDirty: true });
    }
  }, [status, getValues, setValue]);

  const handleOpenPreview = () => { setIsPreviewOpen(true); };
  const handleOpenVehicleDialog = () => { setIsVehicleDialogOpen(true); };
  const handleSignatureClick = () => { setIsSignatureDialogOpen(true); };

  const handleSave = (data: ServiceFormValues) => {
    const finalData = {
        ...data,
        totalCost,
        totalSuppliesWorkshopCost,
        serviceProfit,
    };
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
                description: s.description || '',
                totalCost: s.totalCost || 0,
                suppliesUsed: (s.serviceItems || []).flatMap(i => i.suppliesUsed || []).map(su => ({
                    supplyName: su.supplyName || '',
                    quantity: su.quantity
                }))
            })),
            inventory: inventoryItems.map(i => ({ id: i.id, name: i.name, sellingPrice: i.sellingPrice }))
        });

        const newServiceItems = result.suppliesProposed.map(sp => {
            const inventoryItem = inventoryItems.find(i => i.id === sp.supplyId);
            return {
                id: nanoid(),
                name: inventoryItem?.name || 'Insumo Sugerido',
                price: inventoryItem?.sellingPrice || 0, // Placeholder, will need adjustment
                suppliesUsed: [{
                    supplyId: sp.supplyId,
                    supplyName: inventoryItem?.name || '',
                    quantity: sp.quantity,
                    unitPrice: inventoryItem?.unitPrice || 0,
                    sellingPrice: inventoryItem?.sellingPrice || 0,
                    unitType: inventoryItem?.unitType || 'units',
                }]
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
        setValue(`photoReports.${reportIndex}.photos`, updatedPhotos, { shouldDirty: true });
    }
  }, [getValues, setValue]);

  const handleViewImage = useCallback((url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  }, []);

  return (
    <>
      <Form {...form}>
        <form onSubmit={handleSubmit(handleSave)} className="pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
             <ServiceFormHeader
                onPreview={handleOpenPreview}
                isReadOnly={isReadOnly}
                status={status}
                activeTab={activeTab}
                onTabChange={setActiveTab}
             />
              
             <TabsContent value="servicio" className="mt-6">
                <Card className="shadow-none border-none p-0"><CardContent className="p-0 space-y-6">
                    <VehicleSelectionCard
                        isReadOnly={isReadOnly}
                        localVehicles={vehicles}
                        serviceHistory={serviceHistory}
                        onVehicleSelected={() => {}}
                        onOpenNewVehicleDialog={handleOpenVehicleDialog}
                    />
                    <ServiceDetailsCard
                        isReadOnly={isReadOnly}
                        technicians={technicians}
                        inventoryItems={inventoryItems}
                        serviceTypes={serviceTypes}
                        mode={mode}
                        totalCost={totalCost}
                        totalSuppliesWorkshopCost={totalSuppliesWorkshopCost}
                        serviceProfit={serviceProfit}
                        onGenerateQuoteWithAI={handleGenerateQuote}
                        isGeneratingQuote={isGeneratingQuote}
                    />
                </CardContent></Card>
            </TabsContent>
            
            <TabsContent value="recepcion" className="mt-6">
                <ReceptionAndDelivery
                    control={control}
                    isReadOnly={isReadOnly}
                    isEnhancingText={isEnhancingText}
                    handleEnhanceText={handleEnhanceText}
                />
            </TabsContent>
            
            <TabsContent value="reporte" className="mt-6">
              <PhotoReportTab
                control={control}
                isReadOnly={isReadOnly}
                isEnhancingText={isEnhancingText}
                handleEnhanceText={handleEnhanceText}
                serviceId={serviceId}
                onPhotoUploaded={handlePhotoUpload}
                onViewImage={handleViewImage}
              />
            </TabsContent>

            <TabsContent value="seguridad" className="mt-6">
                 <SafetyChecklist
                    control={control}
                    isReadOnly={isReadOnly}
                    onSignatureClick={handleSignatureClick}
                    signatureDataUrl={watch('safetyInspection.technicianSignature')}
                    isEnhancingText={isEnhancingText}
                    handleEnhanceText={handleEnhanceText}
                    serviceId={serviceId}
                    onPhotoUploaded={(itemName, urls) => {
                       const currentVal = getValues(`safetyInspection.${itemName as keyof ServiceFormValues['safetyInspection']}`);
                       setValue(`safetyInspection.${itemName as keyof ServiceFormValues['safetyInspection']}`, {
                         ...(currentVal || { status: 'na' }),
                         photos: [...(currentVal?.photos || []), ...urls]
                       }, { shouldDirty: true });
                    }}
                    onViewImage={handleViewImage}
                />
            </TabsContent>
          </Tabs>
          
          <ServiceFormFooter
            isEditing={!!initialDataService?.id}
            isReadOnly={isReadOnly}
            isSubmitting={formState.isSubmitting}
            status={status}
            onClose={onClose}
            onCancelService={(reason) => onCancelService && initialDataService?.id && onCancelService(initialDataService.id, reason)}
            onDelete={() => onDelete && initialDataService?.id && onDelete(initialDataService.id)}
          />
        </form>
      </Form>

      <VehicleDialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen} onSave={onVehicleCreated} />
      
      <SignatureDialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen} onSave={(sig) => { setValue('safetyInspection.technicianSignature', sig, { shouldDirty: true }); setIsSignatureDialogOpen(false); }} />

      <UnifiedPreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} service={getValues() as ServiceRecord} vehicle={vehicles.find(v => v.id === watch('vehicleId'))} />
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
            <div className="relative aspect-video w-full"><Image src={viewingImageUrl || ''} alt="Vista ampliada" fill className="object-contain" /></div>
        </DialogContent>
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
