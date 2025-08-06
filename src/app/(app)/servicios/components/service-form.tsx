

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
  CalendarIcon, Wallet, DollarSign, CalendarCheck, Edit, Save, X
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, SafetyInspection, PhotoReportGroup, ServiceItem as ServiceItemType, InventoryCategory, Supplier, Payment, Personnel
} from '@/types'

import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { VehicleSelectionCard } from './VehicleSelectionCard'
import { serviceFormSchema } from '@/schemas/service-form';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { ServiceItemsList } from './ServiceItemsList';
import { PaymentSection } from './PaymentSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PageHeader } from "@/components/page-header";

/* ░░░░░░  COMPONENTE  ░░░░░░ */
interface Props {
  initialDataService?: ServiceRecord|null
  vehicles:Vehicle[]; 
  technicians: User[];
  inventoryItems:InventoryItem[]
  serviceTypes:ServiceTypeRecord[]
  categories: InventoryCategory[];
  suppliers: Supplier[];
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
    categories,
    suppliers,
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
  
  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
  });
  
  useEffect(() => {
    const authUser = (() => {
        try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? 'null') as User | null }
        catch { return null }
    })();
    
    form.reset({
      ...initialDataService,
      allVehiclesForDialog: parentVehicles,
      status: initialDataService?.status || (mode === 'quote' ? 'Cotizacion' : 'En Taller'),
      serviceItems: initialDataService?.serviceItems?.length ? initialDataService.serviceItems : [],
      payments: initialDataService?.payments?.length ? initialDataService.payments : [{ method: 'Efectivo', amount: undefined }],
      serviceAdvisorId: initialDataService?.serviceAdvisorId || authUser?.id,
      serviceAdvisorName: initialDataService?.serviceAdvisorName || authUser?.name,
    });
  }, [initialDataService, parentVehicles, mode, form]);
  
  const { control, setValue, watch, formState, handleSubmit, reset, getValues } = form;
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  useEffect(() => {
    setValue('totalCost', totalCost);
    setValue('totalSuppliesWorkshopCost', totalSuppliesWorkshopCost);
    setValue('serviceProfit', serviceProfit);
    onTotalCostChange(totalCost);
  }, [totalCost, totalSuppliesWorkshopCost, serviceProfit, setValue, onTotalCostChange]);

  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  
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
  
  const formSubmitWrapper = (values: z.infer<typeof serviceFormSchema>) => {
    onSubmit(values as ServiceRecord);
  };
  
  const watchedStatus = watch('status');
  const watchedSubStatus = watch('subStatus');

  const pageTitle = initialDataService ? `Editar Servicio #${initialDataService.id.slice(-6)}` : "Nuevo Servicio / Cotización";
  const pageDescription = initialDataService ? `Modifica los detalles para el vehículo ${initialDataService.vehicleIdentifier || ''}.` : "Completa la información para crear un nuevo registro.";
  
  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />
        <FormProvider {...form}>
            <form ref={ref} id="service-form" onSubmit={handleSubmit(formSubmitWrapper)} className="flex flex-col flex-grow overflow-hidden space-y-6">
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Detalles Generales del Servicio</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField
                            control={control}
                            name="status"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado del Servicio</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Cotizacion">Cotización</SelectItem>
                                    <SelectItem value="Agendado">Agendado</SelectItem>
                                    <SelectItem value="En Taller">En Taller</SelectItem>
                                    <SelectItem value="Entregado">Entregado</SelectItem>
                                </SelectContent>
                                </Select>
                            </FormItem>
                            )}
                        />
                        {watchedStatus === 'En Taller' && (
                            <FormField control={control} name="subStatus" render={({ field }) => ( <FormItem><FormLabel>Sub-Estado Taller</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione sub-estado..." /></SelectTrigger></FormControl><SelectContent>{["Proveedor Externo", "En Espera de Refacciones", "Reparando", "Completado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem> )}/>
                        )}
                    </CardContent>
                </Card>

                <VehicleSelectionCard
                    isReadOnly={isReadOnly}
                    localVehicles={parentVehicles}
                    onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
                    onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
                />

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3">
                    <ServiceItemsList
                        isReadOnly={isReadOnly}
                        inventoryItems={invItems}
                        serviceTypes={serviceTypes}
                        mode={mode}
                        onNewInventoryItemCreated={handleNewInventoryItemCreated}
                        categories={categories}
                        suppliers={suppliers}
                    />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <PaymentSection />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={onClose}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={formState.isSubmitting}
                    >
                        {formState.isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {initialDataService ? "Actualizar Registro" : "Crear Registro"}
                    </Button>
                </div>
            </form>
        </FormProvider>

      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleVehicleCreated}
        vehicle={{ licensePlate: newVehicleInitialPlate }}
      />
    </>
  );
});
ServiceForm.displayName = "ServiceForm";
