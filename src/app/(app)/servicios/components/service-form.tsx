/* ──────────────────────────────────────────────────────────
 * ✨  FORMULARIO PRINCIPAL DE SERVICIOS (REFACtORIZADO)
 * ────────────────────────────────────────────────────────── */

'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, useCallback, useMemo } from 'react'

import type {
  ServiceRecord,
  Vehicle,
  Technician,
  InventoryItem,
  QuoteRecord,
  User,
  ServiceTypeRecord,
} from '@/types'

import { useToast } from '@/hooks/use-toast'
import {
  useInitServiceForm,
  useServiceStatusWatcher,
  useServiceTotals,
} from '@/hooks/use-service-form-hooks'

import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form'
import { cleanObjectForFirestore } from '@/lib/forms'
import { generateQuoteWithAI } from '@/lib/services/quote.service'

import { ServiceFormHeader, ServiceFormFooter } from './ServiceFormLayout'
import { ServiceFormBody } from './ServiceFormBody'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { Tabs } from '@/components/ui/tabs'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'

interface Props {
  initialDataService?: ServiceRecord | null
  initialDataQuote?: Partial<QuoteRecord> | null
  vehicles: Vehicle[]
  technicians: Technician[]
  inventoryItems: InventoryItem[]
  serviceTypes: ServiceTypeRecord[]
  serviceHistory: ServiceRecord[]
  onSubmit: (data: ServiceRecord | QuoteRecord) => Promise<void>
  onClose: () => void
  isReadOnly?: boolean
  onVehicleCreated?: (v: Omit<Vehicle, 'id'>) => void
  mode?: 'service' | 'quote'
  onDelete?: (id: string) => void
  onCancelService?: (id: string, reason: string) => void
  onStatusChange?: (s?: ServiceRecord['status']) => void
}

export function ServiceForm({
  initialDataService,
  initialDataQuote,
  vehicles: parentVehicles,
  technicians,
  inventoryItems: inventoryItemsProp,
  serviceTypes,
  serviceHistory,
  onSubmit,
  onClose,
  isReadOnly = false,
  onVehicleCreated,
  mode = 'service',
  onDelete,
  onCancelService,
  onStatusChange,
}: Props) {
  const { toast } = useToast()
  const initData = initialDataService || initialDataQuote
  const isEditing = !!initData?.id

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
  })
  const { control, setValue, getValues, trigger, formState, watch } = form

  /* -------------------------- CUSTOM HOOKS -------------------------- */
  useInitServiceForm(form, { initData, serviceTypes })
  useServiceStatusWatcher(form, onStatusChange)
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } =
    useServiceTotals(form)

  /* ----------------------------- STATE ---------------------------- */
  const [localVehicles, setLocalVehicles] = useState(parentVehicles)
  const [currentInventoryItems, setCurrentInventoryItems] =
    useState(inventoryItemsProp)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [newVehicleInitialData, setNewVehicleInitialData] =
    useState<Partial<VehicleFormValues> | null>(null)
  
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  
  useEffect(() => setLocalVehicles(parentVehicles), [parentVehicles])
  useEffect(() => setCurrentInventoryItems(inventoryItemsProp), [inventoryItemsProp])

  /* ---------------------------- HANDLERS ---------------------------- */
  const handleSubmit = useCallback(async (formValues: ServiceFormValues) => {
    if (isReadOnly) return onClose()

    const isValid = await trigger()
    if (!isValid) {
      toast({ title: 'Formulario incompleto', variant: 'destructive' })
      return
    }

    const vehicle = localVehicles.find((v) => v.id === formValues.vehicleId)

    const finalData: Partial<ServiceRecord> = {
      ...formValues,
      id: initData?.id,
      vehicleIdentifier: vehicle?.licensePlate || formValues.vehicleLicensePlateSearch,
      technicianName: technicians.find((t) => t.id === formValues.technicianId)?.name,
      totalCost,
      totalSuppliesWorkshopCost,
      serviceProfit,
      serviceItems: formValues.serviceItems.map((it) => ({
        ...it,
        price: Number(it.price) || 0,
      })),
      serviceDate: formValues.serviceDate ? formValues.serviceDate.toISOString() : new Date().toISOString(),
      quoteDate: formValues.quoteDate ? formValues.quoteDate.toISOString() : formValues.status === 'Cotizacion' ? new Date().toISOString() : undefined,
      receptionDateTime: formValues.receptionDateTime ? formValues.receptionDateTime.toISOString() : formValues.status === 'En Taller' ? new Date().toISOString() : undefined,
      deliveryDateTime: formValues.deliveryDateTime ? formValues.deliveryDateTime.toISOString() : undefined,
    }

    await onSubmit(cleanObjectForFirestore(finalData) as ServiceRecord)
    onClose()
  },[isReadOnly, onClose, trigger, toast, localVehicles, initData, technicians, totalCost, totalSuppliesWorkshopCost, serviceProfit, onSubmit])

  const handleGenerateQuote = useCallback(async () => {
    const vehicle = localVehicles.find((v) => v.id === getValues('vehicleId'))
    if (!vehicle) {
      return toast({ title: 'Selecciona un vehículo', variant: 'destructive' })
    }
    const mainItemName = getValues('serviceItems.0.name')
    if (!mainItemName) {
      return toast({ title: 'Ingresa nombre del servicio', variant: 'destructive' })
    }
    setIsGeneratingQuote(true)
    try {
      const result = await generateQuoteWithAI({
        vehicle,
        serviceDescription: mainItemName,
        serviceHistory,
        inventory: currentInventoryItems,
      })
      const currentItems = getValues('serviceItems')
      currentItems[0] = {
        ...currentItems[0],
        price: result.estimatedTotalCost,
        suppliesUsed: result.suppliesProposed.map((sp) => {
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
      setValue('serviceItems', currentItems, { shouldDirty: true })
      setValue('notes', result.reasoning, { shouldDirty: true })
      toast({ title: 'Cotización generada por IA', description: 'Revisa los datos antes de guardar.' })
    } catch (e) {
      toast({ title: 'Error de IA', description: e instanceof Error ? e.message : 'No se pudo generar la cotización.', variant: 'destructive'})
    } finally {
      setIsGeneratingQuote(false)
    }
  }, [localVehicles, getValues, toast, serviceHistory, currentInventoryItems, setValue])


  const openNewVehicleDialog = () => {
    setNewVehicleInitialData({ licensePlate: getValues('vehicleLicensePlateSearch') || '' })
    setIsVehicleDialogOpen(true)
  }
  
  const handleOpenPreview = () => {
    const formData = getValues();
    const serviceDataForPreview = {
      ...formData,
      totalCost: totalCost,
      totalSuppliesWorkshopCost: totalSuppliesWorkshopCost,
      serviceProfit: serviceProfit,
      serviceDate: formData.serviceDate?.toISOString(),
      quoteDate: formData.quoteDate?.toISOString(),
      receptionDateTime: formData.receptionDateTime?.toISOString(),
      deliveryDateTime: formData.deliveryDateTime?.toISOString(),
      serviceAdvisorSignatureDataUrl: formData.serviceAdvisorSignatureDataUrl,
    } as ServiceRecord;
    setServiceForPreview(serviceDataForPreview);
    setIsPreviewOpen(true);
  };


  /* --------------------------- RENDER --------------------------- */
  return (
    <>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs defaultValue="servicio" className="w-full">
            <ServiceFormHeader
              onPreview={handleOpenPreview}
              isReadOnly={isReadOnly}
              status={watch('status')}
            />
            <ServiceFormBody
              isReadOnly={isReadOnly}
              localVehicles={localVehicles}
              serviceHistory={serviceHistory}
              openNewVehicleDialog={openNewVehicleDialog}
              technicians={technicians}
              inventoryItems={currentInventoryItems}
              serviceTypes={serviceTypes}
              mode={mode}
              totalCost={totalCost}
              totalSuppliesWorkshopCost={totalSuppliesWorkshopCost}
              serviceProfit={serviceProfit}
              handleGenerateQuote={handleGenerateQuote}
              isGeneratingQuote={isGeneratingQuote}
            />
          </Tabs>

          <ServiceFormFooter
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            isSubmitting={formState.isSubmitting}
            status={watch('status')}
            onClose={onClose}
            onCancelService={onCancelService && initData?.id ? (reason) => onCancelService(initData.id!, reason) : undefined}
            onDelete={onDelete && initData?.id ? () => onDelete(initData.id!) : undefined}
          />
        </form>
      </FormProvider>

      {/* ----------------- DIÁLOGOS AUXILIARES ----------------- */}
      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        onSave={async (v) => {
          onVehicleCreated?.(v)
          const newVehicle = { id: `new_${Date.now()}`, ...v } as Vehicle
          setLocalVehicles((prev) => [...prev, newVehicle])
          setValue('vehicleId', newVehicle.id)
          setIsVehicleDialogOpen(false)
        }}
        vehicle={newVehicleInitialData}
      />
      {isPreviewOpen && serviceForPreview && (
        <UnifiedPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          service={serviceForPreview}
        />
      )}
    </>
  )
}
