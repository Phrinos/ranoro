/* app/(app)/servicios/components/service-form.tsx */
'use client'

/* ──────────────────────────────────────────────────────────
 * ✨  ESTE ARCHIVO CONTIENE EL FORMULARIO COMPLETO DE
 *     CREACIÓN / EDICIÓN DE SERVICIOS Y COTIZACIONES.
 *     · Copia-y-pega tal cual, remplazando tu archivo.
 *     · Solo se ajustó **lógica** de inicialización / carga
 *       de datos para que al editar se muestren los valores
 *       previos.  La UI permanece intacta.
 * ────────────────────────────────────────────────────────── */

import { zodResolver } from '@hookform/resolvers/zod'
import {
  useForm,
  useWatch,
  useFieldArray,
  Controller,
  type UseFormReturn,
} from 'react-hook-form'
import * as z from 'zod'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import {
  Ban,
  Camera,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  PlusCircle,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import {
  parseISO,
  isValid,
  setHours,
  setMinutes,
  addDays,
  isToday,
  isSameDay,
} from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

import {
  placeholderServiceRecords,
  placeholderInventory,
  AUTH_USER_LOCALSTORAGE_KEY,
} from '@/lib/placeholder-data'

import type {
  ServiceRecord,
  Vehicle,
  Technician,
  InventoryItem,
  QuoteRecord,
  User,
  WorkshopInfo,
  ServiceTypeRecord,
} from '@/types'

import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'

import { ServiceDetailsCard } from './ServiceDetailsCard'
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { ReceptionAndDelivery } from './ReceptionAndDelivery'
import { SafetyChecklist } from './SafetyChecklist'
import { SignatureDialog } from './signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'

import { enhanceText } from '@/ai/flows/text-enhancement-flow'
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow'

/* ──────────────────────────────────────────────────────────
 * 1.  VALIDACIÓN (Zod schemas)
 * ────────────────────────────────────────────────────────── */

const supplySchema = z.object({
  supplyId: z.string().min(1, 'Seleccione un insumo'),
  quantity: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  unitPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplyName: z.string().optional(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
})

const serviceItemSchema = z.object({
  id: z.string(),
  name: z.string().min(3, 'El nombre del servicio es requerido.'),
  price: z
    .coerce.number({ invalid_type_error: 'El precio debe ser un número.' })
    .min(0, 'El precio debe ser un número positivo.')
    .optional(),
  suppliesUsed: z.array(supplySchema),
})

const photoReportGroupSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string().url('URL de foto inválida.')),
})

const safetyCheckValueSchema = z.object({
  status: z.enum(['ok', 'atencion', 'inmediata', 'na']).default('na'),
  photos: z.array(z.string().url()).default([]),
})

const safetyInspectionSchema = z
  .object({
    luces_altas_bajas_niebla: safetyCheckValueSchema.optional(),
    luces_cuartos: safetyCheckValueSchema.optional(),
    luces_direccionales: safetyCheckValueSchema.optional(),
    luces_frenos_reversa: safetyCheckValueSchema.optional(),
    luces_interiores: safetyCheckValueSchema.optional(),
    fugas_refrigerante: safetyCheckValueSchema.optional(),
    fugas_limpiaparabrisas: safetyCheckValueSchema.optional(),
    fugas_frenos_embrague: safetyCheckValueSchema.optional(),
    fugas_transmision: safetyCheckValueSchema.optional(),
    fugas_direccion_hidraulica: safetyCheckValueSchema.optional(),
    carroceria_cristales_espejos: safetyCheckValueSchema.optional(),
    carroceria_puertas_cofre: safetyCheckValueSchema.optional(),
    carroceria_asientos_tablero: safetyCheckValueSchema.optional(),
    carroceria_plumas: safetyCheckValueSchema.optional(),
    suspension_rotulas: safetyCheckValueSchema.optional(),
    suspension_amortiguadores: safetyCheckValueSchema.optional(),
    suspension_caja_direccion: safetyCheckValueSchema.optional(),
    suspension_terminales: safetyCheckValueSchema.optional(),
    llantas_delanteras_traseras: safetyCheckValueSchema.optional(),
    llantas_refaccion: safetyCheckValueSchema.optional(),
    frenos_discos_delanteros: safetyCheckValueSchema.optional(),
    frenos_discos_traseros: safetyCheckValueSchema.optional(),
    otros_tuberia_escape: safetyCheckValueSchema.optional(),
    otros_soportes_motor: safetyCheckValueSchema.optional(),
    otros_claxon: safetyCheckValueSchema.optional(),
    otros_inspeccion_sdb: safetyCheckValueSchema.optional(),
    inspectionNotes: z.string().optional(),
    technicianSignature: z.string().optional(),
  })
  .optional()

const serviceFormSchemaBase = z
  .object({
    id: z.string().optional(),
    publicId: z.string().optional(),

    /* Vehículo */
    vehicleId: z.string().optional(),
    vehicleIdentifier: z.string().optional(), // Stores the license plate for display
    vehicleLicensePlateSearch: z.string().optional(),

    /* Fechas */
    serviceDate: z.date().optional(),
    quoteDate: z.date().optional(),
    receptionDateTime: z.date().optional(),
    deliveryDateTime: z.date().optional(),

    mileage: z
      .coerce.number({ invalid_type_error: 'El kilometraje debe ser numérico.' })
      .int('El kilometraje debe ser un número entero.')
      .min(0, 'El kilometraje no puede ser negativo.')
      .optional(),

    notes: z.string().optional(),

    technicianId: z.string().optional(),
    technicianName: z.string().nullable().optional(),


    serviceItems: z
      .array(serviceItemSchema)
      .min(1, 'Debe agregar al menos un ítem de servicio.'),

    status: z
      .enum(['Cotizacion', 'Agendado', 'En Taller', 'Entregado', 'Cancelado'])
      .optional(),
    subStatus: z
      .enum(['En Espera de Refacciones', 'Reparando', 'Completado'])
      .optional(),

    serviceType: z.string().optional(),

    vehicleConditions: z.string().optional(),
    fuelLevel: z.string().optional(),
    customerItems: z.string().optional(),
    customerSignatureReception: z.string().nullable().optional(),
    customerSignatureDelivery: z.string().nullable().optional(),
    receptionSignatureViewed: z.boolean().optional(),
    deliverySignatureViewed: z.boolean().optional(),

    safetyInspection: safetyInspectionSchema.optional(),

    /* Asesor */
    serviceAdvisorId: z.string().optional(),
    serviceAdvisorName: z.string().optional(),
    serviceAdvisorSignatureDataUrl: z.string().optional(),

    /* Fotos */
    photoReports: z.array(photoReportGroupSchema).optional(),
    
    // Payment fields, just in case
    paymentMethod: z.string().optional(),
    cardFolio: z.string().optional(),
    transferFolio: z.string().optional(),

  })
  .refine(
    (d) => !(d.status === 'Agendado' && !d.serviceDate),
    {
      message: "La fecha de la cita es obligatoria para el estado 'Agendado'.",
      path: ['serviceDate'],
    },
  )

export type ServiceFormValues = z.infer<typeof serviceFormSchemaBase>

/* ──────────────────────────────────────────────────────────
 * 2.  HELPERS
 * ────────────────────────────────────────────────────────── */

const IVA_RATE = 0.16
const parseDate = (d: any) =>
  d && typeof d.toDate === 'function'
    ? d.toDate()
    : typeof d === 'string'
      ? parseISO(d)
      : d

const cleanObject = (o: any): any =>
  o === null || typeof o !== 'object'
    ? o
    : Array.isArray(o)
      ? o.map(cleanObject)
      : Object.entries(o).reduce((acc, [k, v]) => {
          if (v !== undefined) acc[k] = cleanObject(v)
          return acc
        }, {} as any)

/* ──────────────────────────────────────────────────────────
 * 3.  COMPONENTE PRINCIPAL
 * ────────────────────────────────────────────────────────── */

interface Props {
  initialDataService?: ServiceRecord | null
  initialDataQuote?: Partial<QuoteRecord> | null
  vehicles: Vehicle[]
  technicians: Technician[]
  inventoryItems: InventoryItem[]
  serviceHistory: ServiceRecord[]
  serviceTypes: ServiceTypeRecord[]
  onSubmit: (data: ServiceRecord | QuoteRecord) => Promise<void>
  onClose: () => void
  isReadOnly?: boolean
  onVehicleCreated?: (v: Omit<Vehicle, 'id'>) => void
  mode?: 'service' | 'quote'
  onDelete?: (id: string) => void
  onCancelService?: (id: string, reason: string) => void
  onStatusChange?: (s?: ServiceRecord['status']) => void
}

export function ServiceForm ({
  initialDataService,
  initialDataQuote,
  vehicles: parentVehicles,
  technicians,
  inventoryItems: inventoryItemsProp,
  serviceHistory,
  serviceTypes,
  onSubmit,
  onClose,
  isReadOnly = false,
  onVehicleCreated,
  mode = 'service',
  onDelete,
  onCancelService,
  onStatusChange,
}: Props) {
  /* ───────────────────────── STATE / RHF ───────────────────────── */

  const { toast } = useToast();
  const initData = initialDataService || initialDataQuote;
  const isEditing = !!initData?.id;

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchemaBase),
    // Default values will be set in the useEffect to ensure reactivity
  });

  const { control, watch, setValue, getValues, trigger, reset, formState } = form;
  const watchedItems  = useWatch({ control, name: 'serviceItems' })
  const watchedStatus = watch('status')

  useEffect(() => {
    let defaultValues: Partial<ServiceFormValues> = {
      status: mode === 'quote' ? 'Cotizacion' : 'En Taller',
      serviceType: serviceTypes[0]?.name ?? 'Servicio General',
      serviceItems: [{ id: nanoid(), name: '', price: undefined, suppliesUsed: [] }],
      photoReports: [{ id: `rep_recepcion_${Date.now()}`, date: new Date().toISOString(), description: 'Notas de la Recepción', photos: [] }],
      receptionDateTime: new Date() // Set reception time on creation
    };

    if (initData) {
      defaultValues = {
        ...initData,
        serviceDate: initData.serviceDate ? parseDate(initData.serviceDate) : new Date(),
        quoteDate: initData.quoteDate ? parseDate(initData.quoteDate) : undefined,
        receptionDateTime: initData.receptionDateTime ? parseDate(initData.receptionDateTime) : new Date(),
        deliveryDateTime: initData.deliveryDateTime ? parseDate(initData.deliveryDateTime) : undefined,
        serviceItems: initData.serviceItems?.length ? initData.serviceItems : [{ id: nanoid(), name: '', price: undefined, suppliesUsed: [] }],
        photoReports: initData.photoReports?.length ? initData.photoReports : defaultValues.photoReports,
      };
    } else {
        const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        if (authUserString) {
            const currentUser = JSON.parse(authUserString);
            defaultValues.serviceAdvisorId = currentUser.id;
            defaultValues.serviceAdvisorName = currentUser.name;
            defaultValues.serviceAdvisorSignatureDataUrl = currentUser.signatureDataUrl || '';
        }
    }
    
    reset(defaultValues);
  }, [initData, reset, mode, serviceTypes]);


  /* ──────────────────────── CALCULADOS (memo) ──────────────────────── */

  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(() => {
    const total = (watchedItems ?? []).reduce(
      (s, i) => s + (Number(i.price) || 0),
      0,
    )
    const cost = (watchedItems ?? [])
      .flatMap((i) => i.suppliesUsed ?? [])
      .reduce(
        (s, su) => s + (Number(su.unitPrice) || 0) * Number(su.quantity || 0),
        0,
      )
    return { totalCost: total, totalSuppliesWorkshopCost: cost, serviceProfit: total - cost }
  }, [watchedItems])

  /* ───────────────────────── OTROS STATES ───────────────────────── */

  const [localVehicles, setLocalVehicles] = useState(parentVehicles)
  const [currentInventoryItems, setCurrentInventoryItems] = useState(inventoryItemsProp)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [newVehicleInitialData, setNewVehicleInitialData] = useState<Partial<VehicleFormValues> | null>(null)
  const [isTechSignatureDialogOpen, setIsTechSignatureDialogOpen] = useState(false)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [isEnhancingText, setIsEnhancingText] = useState<string | null>(null);


  const [isCancelAlertOpen,  setIsCancelAlertOpen]  = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')


  useEffect(() => {
    setLocalVehicles(parentVehicles);
  }, [parentVehicles]);

  useEffect(() => {
    setCurrentInventoryItems(inventoryItemsProp);
  }, [inventoryItemsProp]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(watchedStatus);
    }
  }, [watchedStatus, onStatusChange]);

  /* ─────────────────────────  HANDLERS  ───────────────────────── */

  /** Cálculo y guardado */
  const handleSubmit = useCallback(
    async (formValues: ServiceFormValues) => {
      if (isReadOnly) return onClose()

      if (!(await trigger())) {
        toast({ title: 'Formulario incompleto', variant: 'destructive' })
        return
      }

      const vehicle = localVehicles.find(v => v.id === formValues.vehicleId);

      /* datos extras antes de enviar */
      const finalData: Partial<ServiceRecord> = {
        ...formValues,
        id: initData?.id, // Ensure ID is passed for updates
        vehicleIdentifier: vehicle?.licensePlate || formValues.vehicleLicensePlateSearch,
        technicianName: technicians.find(t => t.id === formValues.technicianId)?.name,
        totalCost,
        totalSuppliesWorkshopCost,
        serviceProfit,
        serviceItems: formValues.serviceItems.map((it) => ({
          ...it,
          price: Number(it.price) || 0,
        })),
        serviceDate:       formValues.serviceDate       ? formValues.serviceDate.toISOString()       : new Date().toISOString(),
        quoteDate:         formValues.quoteDate         ? formValues.quoteDate.toISOString()         : (formValues.status === 'Cotizacion' ? new Date().toISOString() : null),
        receptionDateTime: formValues.receptionDateTime ? formValues.receptionDateTime.toISOString() : (formValues.status === 'En Taller' ? new Date().toISOString() : null),
        deliveryDateTime:  formValues.deliveryDateTime  ? formValues.deliveryDateTime.toISOString()  : null,
      }

      await onSubmit(cleanObject(finalData) as ServiceRecord);
      onClose();
    },
    [isReadOnly, onClose, trigger, toast, totalCost, totalSuppliesWorkshopCost, serviceProfit, onSubmit, initData, localVehicles, technicians]
  );
  
   const handleEnhanceText = async (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => {
    const currentValue = getValues(fieldName);
    if (!currentValue) return;

    setIsEnhancingText(fieldName);
    try {
      const contextMap = {
        'notes': 'Notas Internas del Servicio',
        'vehicleConditions': 'Condiciones del Vehículo',
        'customerItems': 'Pertenencias del Cliente',
        'safetyInspection.inspectionNotes': 'Observaciones de Inspección',
      };
      const context = contextMap[fieldName as keyof typeof contextMap] || 'Descripción de foto';
      const enhancedValue = await enhanceText({ text: currentValue, context });
      setValue(fieldName, enhancedValue, { shouldDirty: true });
    } catch (e) {
      console.error("Error enhancing text:", e);
      toast({ title: "Error de IA", description: "No se pudo mejorar el texto.", variant: "destructive" });
    } finally {
      setIsEnhancingText(null);
    }
  };

  /* Generación IA */
  const handleGenerateQuote = useCallback(async () => {
    const vehicle = localVehicles.find((v) => v.id === getValues('vehicleId'))
    if (!vehicle) {
      toast({ title: 'Selecciona un vehículo', variant: 'destructive' })
      return
    }

    const mainItem = getValues('serviceItems')[0]
    if (!mainItem?.name) {
      toast({ title: 'Ingresa nombre del servicio', variant: 'destructive' })
      return
    }

    setIsGeneratingQuote(true)
    try {
      const res = await suggestQuote({
        vehicleInfo: { make: vehicle.make, model: vehicle.model, year: vehicle.year },
        serviceDescription: mainItem.name,
        serviceHistory: serviceHistory.map((s) => ({
          description: s.description ?? '',
          totalCost: s.totalCost ?? 0,
          suppliesUsed: (s.serviceItems ?? []).flatMap((i) => i.suppliesUsed ?? []).map((su) => ({
            supplyName: su.supplyName ?? '',
            quantity: su.quantity,
          })),
        })),
        inventory: currentInventoryItems.map((i) => ({
          id: i.id,
          name: i.name,
          sellingPrice: i.sellingPrice,
        })),
      })

      /* aplica sugerencia */
      const items = [...getValues('serviceItems')]
      items[0] = {
        ...items[0],
        price: res.estimatedTotalCost,
        suppliesUsed: res.suppliesProposed.map((sp) => {
          const inv = currentInventoryItems.find((i) => i.id === sp.supplyId)
          return {
            supplyId: sp.supplyId,
            quantity: sp.quantity,
            supplyName: inv?.name ?? 'Desconocido',
            isService: inv?.isService ?? false,
            unitType: inv?.unitType ?? 'units',
            unitPrice: inv?.unitPrice ?? 0,
            sellingPrice: inv?.sellingPrice ?? 0,
          }
        }),
      }
      setValue('serviceItems', items)
      setValue('notes', res.reasoning, { shouldDirty: true })

      toast({ title: 'Cotización generada', description: 'Revisa los datos antes de guardar.' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Error de IA', variant: 'destructive' })
    } finally {
      setIsGeneratingQuote(false)
    }
  }, [localVehicles, getValues, toast, serviceHistory, currentInventoryItems, setValue])
  
   const handlePhotoUploaded = useCallback((reportIndex: number, url: string) => {
    const currentReports = getValues('photoReports') || [];
    const updatedReports = [...currentReports];
    if (updatedReports[reportIndex]) {
      updatedReports[reportIndex].photos.push(url);
      setValue('photoReports', updatedReports, { shouldDirty: true });
    }
  }, [getValues, setValue]);

  const handlePhotoDeleted = useCallback((reportIndex: number, photoIndex: number) => {
    const currentReports = getValues('photoReports') || [];
    const updatedReports = [...currentReports];
    if (updatedReports[reportIndex]) {
      updatedReports[reportIndex].photos.splice(photoIndex, 1);
      setValue('photoReports', updatedReports, { shouldDirty: true });
    }
  }, [getValues, setValue]);

  const handleSafetyPhotoUploaded = useCallback((itemName: string, urls: string[]) => {
      const fieldName = `safetyInspection.${itemName as keyof ServiceFormValues['safetyInspection']}`;
      const currentVal = getValues(fieldName) || { status: 'na', photos: [] };
      const newPhotos = [...(currentVal.photos || []), ...urls];
      setValue(fieldName, { ...currentVal, photos: newPhotos }, { shouldDirty: true });
  }, [getValues, setValue]);
  
  const openNewVehicleDialog = () => {
    const plate = getValues('vehicleLicensePlateSearch') || '';
    setNewVehicleInitialData({ licensePlate: plate });
    setIsVehicleDialogOpen(true);
  };

  /* ---------------------------------------------------------------------- */
  /*                                RENDER                                  */
  /* ---------------------------------------------------------------------- */

  /* Tabs a mostrar */
  const showAdv = watchedStatus && ['En Taller', 'Entregado', 'Cancelado'].includes(watchedStatus)
  const tabs = [
    { value: 'servicio', label: 'Detalles', icon: Wrench, show: true },
    { value: 'recepcion', label: 'Rec. y Ent.', icon: CheckCircle,  show: showAdv },
    { value: 'seguridad', label: 'Revisión',   icon: ShieldCheck,  show: showAdv },
  ].filter((t) => t.show)

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-24">

          {/* ---------------------- Tabs header sticky ---------------------- */}
          <Tabs defaultValue="servicio" className="w-full">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 pt-2 pb-2 border-b">
              <div className="flex justify-between items-center">
                <TabsList
                  className={cn('grid w-full mb-0', `grid-cols-${tabs.length}`)}
                >
                  {tabs.map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm flex items-center gap-2"
                    >
                      <t.icon className="h-4 w-4 mr-1.5 shrink-0" />
                      <span className="hidden sm:inline">{t.label}</span>
                      <span className="sm:hidden">{t.label.slice(0, 5)}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {!isReadOnly && (
                  <Button
                    type="button"
                    onClick={() => {
                      setIsPreviewOpen(true)
                    }}
                    variant="ghost"
                    size="icon"
                    title="Vista previa"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* -------------------- TAB: servicio -------------------- */}
            <TabsContent value="servicio" className="mt-6">
              <Card className="shadow-none border-none p-0">
                <CardContent className="p-0 space-y-6">

                  <VehicleSelectionCard
                    isReadOnly={isReadOnly}
                    localVehicles={localVehicles}
                    serviceHistory={serviceHistory}
                    onVehicleSelected={() => {}}
                    onOpenNewVehicleDialog={openNewVehicleDialog}
                  />

                  <ServiceDetailsCard
                    isReadOnly={isReadOnly}
                    technicians={technicians}
                    inventoryItems={currentInventoryItems}
                    serviceTypes={serviceTypes}
                    mode={mode}
                    totalCost={totalCost}
                    totalSuppliesWorkshopCost={totalSuppliesWorkshopCost}
                    serviceProfit={serviceProfit}
                    onGenerateQuoteWithAI={handleGenerateQuote}
                    isGeneratingQuote={isGeneratingQuote}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ------------------- TAB: recepción / entrega ------------------- */}
            <TabsContent value="recepcion" className="mt-6">
              <ReceptionAndDelivery
                isReadOnly={isReadOnly}
                isEnhancingText={isEnhancingText}
                handleEnhanceText={handleEnhanceText}
              />
            </TabsContent>

            {/* ------------------ TAB: checklist de seguridad ----------------- */}
            <TabsContent value="seguridad" className="mt-6">
              <SafetyChecklist
                control={control as unknown as Control<any>}
                isReadOnly={isReadOnly}
                onSignatureClick={() => setIsTechSignatureDialogOpen(true)}
                signatureDataUrl={watch('safetyInspection.technicianSignature')}
                isEnhancingText={isEnhancingText}
                handleEnhanceText={handleEnhanceText}
                serviceId={initData?.id || 'new_service'}
                onPhotoUploaded={handleSafetyPhotoUploaded}
                onViewImage={(url) => { setViewingImageUrl(url); setIsImageViewerOpen(true); }}
              />
            </TabsContent>
          </Tabs>

          {/* ---------------------- FOOTER ACTION BAR ---------------------- */}
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 border-t p-3 md:pl-[var(--sidebar-width)] print:hidden">
            <div className="container mx-auto max-w-6xl flex justify-between items-center gap-2">
              <div>
                {isEditing && onDelete && (
                  <Button variant="destructive" type="button" onClick={() => onDelete(initData.id!)}>Eliminar</Button>
                )}
                 {isEditing && onCancelService && watchedStatus !== 'Cancelado' && (
                  <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                    <AlertDialogTrigger asChild><Button variant="outline" type="button">Cancelar Servicio</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>¿Cancelar este servicio?</AlertDialogTitle><AlertDialogDescription>El estado cambiará a "Cancelado" y no se podrá revertir.</AlertDialogDescription></AlertDialogHeader>
                        <Textarea placeholder="Motivo de la cancelación (opcional)..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
                        <AlertDialogFooter><AlertDialogCancel>Cerrar</AlertDialogCancel><AlertDialogAction onClick={() => { if(initData.id) onCancelService(initData.id, cancellationReason); }}>Sí, Cancelar</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex gap-2">
                {isReadOnly ? (
                  <Button variant="outline" type="button" onClick={onClose}>Cerrar</Button>
                ) : (
                  <>
                    <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={formState.isSubmitting || !getValues('vehicleId')}>
                        {formState.isSubmitting ? 'Guardando…' : isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* -------------------- DIÁLOGOS AUXILIARES -------------------- */}

      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        onSave={async (v) => {
          if(onVehicleCreated) await onVehicleCreated(v);
          const newVehicle = { id: `new_${Date.now()}`, ...v } as Vehicle;
          setLocalVehicles(prev => [...prev, newVehicle]);
          setValue('vehicleId', newVehicle.id);
          setIsVehicleDialogOpen(false);
          toast({ title: 'Vehículo creado localmente.' });
        }}
        vehicle={newVehicleInitialData}
      />

      <SignatureDialog
        open={isTechSignatureDialogOpen}
        onOpenChange={setIsTechSignatureDialogOpen}
        onSave={(s) => {
          setValue('safetyInspection.technicianSignature', s, { shouldDirty: true })
          setIsTechSignatureDialogOpen(false);
        }}
      />

      {isPreviewOpen && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          service={{...getValues() as ServiceRecord, totalCost, serviceProfit, totalSuppliesWorkshopCost}}
          vehicle={localVehicles.find((v) => v.id === getValues('vehicleId')) ?? null}
          associatedQuote={null}
        />
      )}

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="print:hidden">
            <DialogTitle>Vista Previa de Imagen</DialogTitle>
            <DialogDescription>
              Puedes descargar la imagen si lo necesitas.
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {viewingImageUrl && (
              <Image
                src={viewingImageUrl}
                alt="Vista ampliada"
                fill
                className="object-contain"
                crossOrigin="anonymous"
              />
            )}
          </div>
          <DialogFooter className="mt-2 print:hidden">
            <Button
              onClick={() => {
                if (viewingImageUrl) window.open(viewingImageUrl, '_blank')?.focus()
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
