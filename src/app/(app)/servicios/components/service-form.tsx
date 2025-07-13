

'use client'
/* ————————————————————————————————
 *  FORMULARIO servicio / cotización
 *  – Inicializa correctamente “nuevo” (Cotizacion)
 *  – Carga datos al editar
 *  – Vista previa unificada funcional
 *  ———————————————————————————————— */

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, type Control } from 'react-hook-form'
import * as z from 'zod'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import { Ban, Camera, CheckCircle, Download, Eye, ShieldCheck, Trash2, Wrench } from 'lucide-react'
import { parseISO } from 'date-fns'

import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, ServiceTypeRecord } from '@/types'

import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { ServiceDetailsCard } from './ServiceDetailsCard'
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { ReceptionAndDelivery } from './ReceptionAndDelivery'
import { SafetyChecklist } from './SafetyChecklist'
import { SignatureDialog } from './signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

/* ══ 1. Validación ════════════════════════════════════ */

const serviceFormSchema = z.object({
  id: z.string().optional(),
  status: z.enum(['Cotizacion', 'Agendado', 'En Taller', 'Entregado', 'Cancelado']),
  serviceType: z.string(),
  vehicleId: z.string().optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate: z.date().optional(),
  serviceItems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.coerce.number().optional(),
    suppliesUsed: z.array(z.any()),
  })).min(1),
  photoReports: z.array(z.object({ id: z.string(), date: z.string(), photos: z.array(z.string()) })),
  /* … resto omitido (no se valida en vista previa) … */
})
export type ServiceFormValues = z.infer<typeof serviceFormSchema>

/* ══ 2. Componente ════════════════════════════════════ */
interface Props {
  initialDataService?: ServiceRecord | null
  vehicles: Vehicle[]
  technicians: Technician[]
  inventoryItems: InventoryItem[]
  serviceTypes: ServiceTypeRecord[]
  onSubmit(data: ServiceRecord | QuoteRecord): Promise<void>
  onClose(): void
  isReadOnly?: boolean
  mode?: 'service' | 'quote'
  onDelete?: (id: string) => void;
  onCancelService?: (id: string, reason: string) => void;
  onStatusChange?: (s?: ServiceRecord['status']) => void;
}

export function ServiceForm ({
  initialDataService,
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  onSubmit,
  onClose,
  isReadOnly = false,
  mode = 'service',
  onDelete,
  onCancelService,
  onStatusChange,
}: Props) {
  const { toast } = useToast()
  /* —— defaults —— */
  const firstType = serviceTypes[0]?.name ?? 'Servicio General'
  const currentUser: User | null = (() => { try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? 'null') } catch { return null } })()
  const editing = initialDataService

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: editing ? {
      ...editing,
      serviceDate: editing.serviceDate ? parseISO(editing.serviceDate) : undefined,
      serviceItems: editing.serviceItems?.length ? editing.serviceItems : [{ id: nanoid(), name: firstType, price: editing.totalCost, suppliesUsed: [] }],
      photoReports: editing.photoReports?.length ? editing.photoReports : [{ id: `rep_${Date.now()}`, date: new Date().toISOString(), photos: [] }],
      serviceType: editing.serviceType ?? firstType,
    } : {
      status: 'Cotizacion',
      serviceType: firstType,
      serviceItems: [{ id: nanoid(), name: firstType, price: undefined, suppliesUsed: [] }],
      photoReports: [{ id: `rep_${Date.now()}`, date: new Date().toISOString(), photos: [] }],
      serviceAdvisorId: currentUser?.id,
      serviceAdvisorName: currentUser?.name,
      serviceAdvisorSignatureDataUrl: currentUser?.signatureDataUrl,
    } as any,
    mode: 'onBlur',
  })

  const { getValues, formState, watch } = form
  const status = watch('status')
  const items = watch('serviceItems')
  const totalCost = useMemo(() => items.reduce((s, i) => s + (Number(i.price) || 0), 0), [items])

  /* —— vista previa —— */
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<ServiceRecord | null>(null)

  const openPreview = () => {
    setPreviewData({
      ...(getValues() as unknown as ServiceRecord),
      totalCost,
    })
    setPreviewOpen(true)
  }

  /* —— guardar —— */
  const save = async (v: ServiceFormValues) => {
    if (isReadOnly) { onClose(); return }
    try {
      await onSubmit({ ...v, totalCost } as ServiceRecord)
      onClose()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  /* —— tabs dinámicos —— */
  const showAdv = ['En Taller', 'Entregado', 'Cancelado'].includes(status)
  const tabs = [{ id: 'servicio', label: 'Detalles', icon: Wrench },
    ...(showAdv ? [
      { id: 'recepcion', label: 'Rec./Ent.' },
      { id: 'reporte', label: 'Fotos' },
      { id: 'seguridad', label: 'Revisión' },
    ] : [])]

  /* —— UI —— */
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="space-y-6 pb-24">
          {/* Header Tabs */}
          <Tabs defaultValue="servicio">
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b -mx-6 px-6 py-2 z-10 flex justify-between">
              <TabsList className={cn('grid w-full', `grid-cols-${tabs.length}`)}>
                {tabs.map(t => (
                  <TabsTrigger key={t.id} value={t.id} className="text-xs sm:text-sm flex items-center gap-1.5">
                    {t.icon && <t.icon className="h-4 w-4" />}{t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {!isReadOnly && (
                <Button type="button" variant="ghost" size="icon" onClick={openPreview} title="Vista previa">
                  <Eye className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* TAB contenido */}
            <TabsContent value="servicio" className="mt-6">
              <Card className="shadow-none"><CardContent className="p-0 space-y-6">
                <VehicleSelectionCard
                  isReadOnly={isReadOnly}
                  localVehicles={vehicles}
                  serviceHistory={[]}
                  onVehicleSelected={() => { }}
                  onOpenNewVehicleDialog={() => { }}
                />

                <ServiceDetailsCard
                  isReadOnly={isReadOnly}
                  technicians={technicians}
                  inventoryItems={inventoryItems}
                  serviceTypes={serviceTypes}
                  mode={mode}
                  totalCost={totalCost}
                  totalSuppliesWorkshopCost={0}
                  serviceProfit={0}
                  onGenerateQuoteWithAI={() => toast({ title: 'IA no implementada' })}
                  isGeneratingQuote={false}
                />
              </CardContent></Card>
            </TabsContent>

            {showAdv && (
              <>
                <TabsContent value="recepcion" className="mt-6"><ReceptionAndDelivery control={form.control} isReadOnly={isReadOnly} isEnhancingText={null} handleEnhanceText={() => {}} /></TabsContent>
                <TabsContent value="reporte" className="mt-6">Fotos…</TabsContent>
                <TabsContent value="seguridad" className="mt-6"><SafetyChecklist control={form.control as Control<any>} isReadOnly={isReadOnly} onSignatureClick={() => {}} serviceId={getValues('id') || 'new'} onPhotoUploaded={() => {}} onViewImage={() => {}} isEnhancingText={null} handleEnhanceText={() => {}} /></TabsContent>
              </>
            )}
          </Tabs>

          {/* action bar */}
          <div className="fixed bottom-0 inset-x-0 bg-background/95 border-t p-3 flex justify-end gap-2 print:hidden">
            {onDelete && editing?.id && (
                <ConfirmDialog
                    triggerButton={<Button variant="destructive" type="button">Eliminar</Button>}
                    title="¿Eliminar Registro?"
                    description="Esta acción no se puede deshacer y eliminará permanentemente este registro. ¿Está seguro?"
                    onConfirm={() => onDelete(editing.id!)}
                />
            )}
            <div className="flex-grow" />
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button disabled={formState.isSubmitting || !getValues('vehicleId')} type="submit">
              {formState.isSubmitting ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Form>

      {/* —— Vista previa —— */}
      {previewData && (
        <UnifiedPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          service={previewData}
          vehicle={vehicles.find(v => v.id === previewData.vehicleId) ?? null}
        />
      )}
    </>
  )
}
