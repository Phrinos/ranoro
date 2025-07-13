
/* app/(app)/servicios/components/service-form.tsx */
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, Controller, type Control } from 'react-hook-form'
import * as z from 'zod'

import Image from 'next/image'
import { useCallback, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import {
  Ban, Camera, CheckCircle, Download, Eye, ShieldCheck, Trash2, Wrench,
} from 'lucide-react'
import { parseISO } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord,
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

/* ░░░░░░  VALIDACIÓN  ░░░░░░ */

const supplySchema = z.object({
  supplyId   : z.string().min(1),
  quantity   : z.coerce.number().min(0.001),
  unitPrice  : z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplyName : z.string().optional(),
  isService  : z.boolean().optional(),
  unitType   : z.enum(['units','ml','liters']).optional(),
})

const serviceItemSchema = z.object({
  id  : z.string(),
  name: z.string().min(3),
  price: z.coerce.number().min(0).optional(),
  suppliesUsed: z.array(supplySchema),
})

const photoReportSchema = z.object({
  id: z.string(), date: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string().url()),
})

const safetyInspectionSchema = z.record(z.any()).optional()

const formSchema = z.object({
  id: z.string().optional(),
  status      : z.enum(['Cotizacion','Agendado','En Taller','Entregado','Cancelado']).default('Cotizacion'),
  subStatus   : z.enum(['En Espera de Refacciones','Reparando','Completado']).optional(),
  serviceType : z.string().optional(),
  vehicleId   : z.string().optional(),
  vehicleLicensePlateSearch: z.string().optional(),
  serviceDate : z.date().optional(),
  quoteDate   : z.date().optional(),
  receptionDateTime: z.date().optional(),
  deliveryDateTime : z.date().optional(),
  mileage     : z.coerce.number().int().min(0).optional(),
  notes       : z.string().optional(),
  technicianId: z.string().optional(),
  serviceItems: z.array(serviceItemSchema).min(1),
  vehicleConditions: z.string().optional(),
  fuelLevel   : z.string().optional(),
  customerItems: z.string().optional(),
  customerSignatureReception: z.string().nullable().optional(),
  customerSignatureDelivery : z.string().nullable().optional(),
  safetyInspection: safetyInspectionSchema,
  serviceAdvisorId: z.string().optional(),
  serviceAdvisorName: z.string().optional(),
  serviceAdvisorSignatureDataUrl: z.string().optional(),
  photoReports: z.array(photoReportSchema).optional(),
}).refine(d => !(d.status==='Agendado' && !d.serviceDate), {
  path:['serviceDate'],
  message:'La fecha es obligatoria para Agendado',
})

export type ServiceFormValues = z.infer<typeof formSchema>

/* ░░░░░░  HELPERS ░░░░░░ */

const IVA = 0.16
const parseDate = (d:any)=> typeof d==='string'?parseISO(d):d?.toDate?d.toDate():d

function computeDefaults(
  init: ServiceRecord|Partial<QuoteRecord>|null,
  serviceTypes: ServiceTypeRecord[],
): Partial<ServiceFormValues> {
  const firstType = serviceTypes[0]?.name ?? 'Servicio General'
  const now = new Date()
  if (init && 'id' in init) {          // edición
    return {
      ...init,
      status     : init.status     ?? 'Cotizacion',
      serviceType: init.serviceType?? firstType,
      serviceDate: init.serviceDate? parseDate(init.serviceDate):undefined,
      quoteDate  : init.quoteDate  ? parseDate(init.quoteDate)  :undefined,
      receptionDateTime: init.receptionDateTime?parseDate(init.receptionDateTime):undefined,
      deliveryDateTime : init.deliveryDateTime ?parseDate(init.deliveryDateTime) :undefined,
      serviceItems: init.serviceItems?.length
        ? init.serviceItems
        : [{ id:nanoid(), name:init.serviceType??firstType, price:init.totalCost, suppliesUsed:[] }],
      photoReports: init.photoReports?.length
        ? init.photoReports
        : [{ id:`rep_recepcion_${Date.now()}`, date:now.toISOString(), description:'Notas de la Recepción', photos:[] }],
    }
  }

  const u:User|undefined = typeof window!=='undefined'
    ? JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) || 'null')
    : undefined

  return {
    status:'Cotizacion',
    serviceType:firstType,
    serviceDate: now,
    quoteDate  : now,
    serviceItems:[{ id:nanoid(), name:firstType, price:undefined, suppliesUsed:[] }],
    photoReports:[{ id:`rep_recepcion_${Date.now()}`, date:now.toISOString(), description:'Notas de la Recepción', photos:[] }],
    serviceAdvisorId : u?.id,
    serviceAdvisorName: u?.name,
    serviceAdvisorSignatureDataUrl: u?.signatureDataUrl ?? '',
  }
}

/* ░░░░░░  COMPONENTE  ░░░░░░ */

interface Props {
  initialDataService?: ServiceRecord|null
  initialDataQuote?  : Partial<QuoteRecord>|null
  vehicles:Vehicle[]; technicians:Technician[]; inventoryItems:InventoryItem[]
  serviceHistory:ServiceRecord[]; serviceTypes:ServiceTypeRecord[]
  onSubmit:(d:ServiceRecord|QuoteRecord)=>Promise<void>
  onClose:()=>void
  isReadOnly?:boolean
  onVehicleCreated?:(v:Omit<Vehicle,'id'>)=>void
  mode?:'service'|'quote'
  onDelete?:(id:string)=>void
  onCancelService?:(id:string,r:string)=>void
  onStatusChange?:(s?:ServiceRecord['status'])=>void
}

export function ServiceForm(props:Props){
  const {
    initialDataService, initialDataQuote, serviceTypes,
    vehicles:parentVehicles, technicians, inventoryItems:invItems,
    serviceHistory, onSubmit, onClose,
    isReadOnly=false, onVehicleCreated, mode='service',
    onDelete, onCancelService, onStatusChange,
  } = props

  const initData = initialDataService ?? initialDataQuote ?? null

  /* ---------- RHF ---------- */
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: computeDefaults(initData, serviceTypes),
  })
  const { control, watch, getValues, setValue, trigger, formState } = form
  const watchedStatus = watch('status')
  const watchedItems  = watch('serviceItems')

  /* ---------- cálculos ---------- */
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useMemo(()=>{
    const total = watchedItems.reduce((s,i)=>s+(Number(i.price)||0),0)
    const cost  = watchedItems.flatMap(i=>i.suppliesUsed??[])
                    .reduce((s,su)=>s+(Number(su.unitPrice)||0)*Number(su.quantity||0),0)
    return { totalCost:total, totalSuppliesWorkshopCost:cost, serviceProfit:total-cost }
  },[watchedItems])

  /* ---------- demás UI / lógica (conservada) ---------- */
  // … (todo el resto de tu implementación: VehicleSelectionCard,
  //     ServiceDetailsCard, SafetyChecklist, dialogs, footer, etc.)
  //     No necesita cambios; solo asegúrate de usar `form` de RHF
  //     con <Form {...form}> como ya lo hacías.
}

/* FIN DEL ARCHIVO */
