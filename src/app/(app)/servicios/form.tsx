
/* app/(app)/servicios/form.tsx */
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, SafetyInspection, PhotoReportGroup, ServiceItem as ServiceItemType, InventoryCategory, Supplier, PaymentMethod, Personnel
} from '@/types'

import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { VehicleSelectionCard } from './components/VehicleSelectionCard'
import { serviceFormSchema } from '@/schemas/service-form';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import { ServiceItemsList } from './components/ServiceItemsList';
import { ServiceSummary } from './components/ServiceSummary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  
  const defaultValues = useMemo<z.infer<typeof serviceFormSchema>>(() => {
    const firstType = serviceTypes[0]?.name ?? 'Servicio General';
    const now = new Date();
    const status = initialDataService?.status ?? (mode === 'quote' ? 'Cotizacion' : 'En Taller');

    if (initialDataService) {
      return {
        ...initialDataService,
        allVehiclesForDialog: parentVehicles,
      } as z.infer<typeof serviceFormSchema>;
    }

    const authUser = (() => {
        try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? 'null') as User | null }
        catch { return null }
    })();

    return {
      allVehiclesForDialog: parentVehicles,
      status: status,
      serviceType: firstType,
      serviceItems: [],
      payments: [{ method: 'Efectivo', amount: undefined }],
      serviceAdvisorId: authUser?.id,
      serviceAdvisorName: authUser?.name,
    } as z.infer<typeof serviceFormSchema>;
  }, [initialDataService, serviceTypes, mode, parentVehicles]);

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues,
  });
  
  const { control, setValue, watch, formState, handleSubmit, reset, getValues } = form;
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  useEffect(() => {
    onTotalCostChange(totalCost);
  }, [totalCost, onTotalCostChange]);

  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false)
  const [newVehicleInitialPlate, setNewVehicleInitialPlate] = useState<string | undefined>(undefined);
  
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    inventoryService.onCategoriesUpdate(setAllCategories);
    inventoryService.onSuppliersUpdate(setAllSuppliers);
  }, []);


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
    const dataToSubmit: any = { ...values };
    
    dataToSubmit.totalCost = totalCost;
    dataToSubmit.totalSuppliesWorkshopCost = totalSuppliesWorkshopCost;
    dataToSubmit.serviceProfit = serviceProfit;
    
    const IVA = 0.16;
    dataToSubmit.subTotal = totalCost / (1 + IVA);
    dataToSubmit.taxAmount = totalCost - (totalCost / (1 + IVA));

    if (dataToSubmit.technicianId) {
        const technician = technicians.find(t => t.id === dataToSubmit.technicianId);
        dataToSubmit.technicianName = technician?.name || null;
    }

    if (!initialDataService?.id && dataToSubmit.serviceAdvisorSignatureDataUrl && !dataToSubmit.serviceAdvisorSignatureDataUrl.startsWith('data:')) {
        const authUser = JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) || 'null');
        if (authUser?.signatureDataUrl) {
            dataToSubmit.serviceAdvisorSignatureDataUrl = authUser.signatureDataUrl;
        }
    }

    onSubmit(dataToSubmit);
  };
  
    const watchedStatus = watch('status');
    const [isServiceDatePickerOpen, setIsServiceDatePickerOpen] = useState(false);

    const showAppointmentFields = useMemo(() => {
        return watchedStatus === 'Agendado';
    }, [watchedStatus]);

    const showTechnicianField = useMemo(() => {
        return watchedStatus === 'En Taller' || watchedStatus === 'Entregado';
    }, [watchedStatus]);


  return (
    <>
        <FormProvider {...form}>
            <form ref={ref} id="service-form" onSubmit={handleSubmit(formSubmitWrapper)} className="flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto space-y-6">
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
                            <FormField
                                control={control}
                                name="serviceType"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Servicio</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {serviceTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </FormItem>
                                )}
                            />
                            {showAppointmentFields && (
                                <FormField
                                    control={control}
                                    name="serviceDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Fecha de Cita</FormLabel>
                                            <Popover open={isServiceDatePickerOpen} onOpenChange={setIsServiceDatePickerOpen}>
                                                <PopoverTrigger asChild disabled={isReadOnly}>
                                                    <Button variant="outline" className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")} disabled={isReadOnly}>
                                                        {field.value ? format(new Date(field.value), "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsServiceDatePickerOpen(false); }} disabled={isReadOnly} initialFocus locale={es} />
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                            )}
                            {showTechnicianField && (
                                <FormField
                                    control={control}
                                    name="technicianId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Técnico Asignado</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione técnico..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {technicians.filter(t => !t.isArchived).map((tech) => (
                                                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <VehicleSelectionCard
                        isReadOnly={props.isReadOnly}
                        localVehicles={parentVehicles}
                        onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
                        onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                      <div className="lg:col-span-3">
                        <ServiceItemsList
                            isReadOnly={props.isReadOnly}
                            inventoryItems={invItems}
                            mode={mode}
                            onNewInventoryItemCreated={handleNewInventoryItemCreated}
                            categories={allCategories}
                            suppliers={allSuppliers}
                        />
                      </div>
                      <div className="lg:col-span-2 space-y-6">
                          <ServiceSummary />
                      </div>
                    </div>
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
