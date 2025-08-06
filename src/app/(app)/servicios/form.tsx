/* app/(app)/servicios/components/service-form.tsx */
'use client'

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import * as z from 'zod'

import Image from 'next/image'
import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import {
  Ban, Camera, CheckCircle, Download, Eye, ShieldCheck, Trash2, Wrench, BrainCircuit, Loader2, PlusCircle, Signature,
  Wallet, DollarSign, CalendarCheck, Edit
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, SafetyInspection, PhotoReportGroup, ServiceItem as ServiceItemType, SafetyCheckValue, InventoryCategory, Supplier, PaymentMethod, Personnel
} from '@/types'

import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog'
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form'
import { VehicleSelectionCard } from './components/VehicleSelectionCard'
import { ReceptionAndDelivery } from './components/ReceptionAndDelivery'
import { SafetyChecklist } from './components/SafetyChecklist'
import { SignatureDialog } from './components/signature-dialog'
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog'
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow'
import { enhanceText } from '@/ai/flows/text-enhancement-flow'
import { PhotoReportTab } from './components/PhotoReportTab';
import { serviceFormSchema } from '@/schemas/service-form';
import { parseDate } from '@/lib/forms';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
import Link from 'next/link';
import { ServiceDetailsHeader } from './components/ServiceDetailsHeader';
import { ServiceItemsList } from './components/ServiceItemsList';
import { ServiceSummary } from './components/ServiceSummary';

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
        payments: initialDataService.payments?.length ? initialDataService.payments : [],
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
      } as ServiceFormValues;
    }

    const authUser = (() => {
        try { return JSON.parse(localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) ?? 'null') as User | null }
        catch { return null }
    })();

    return {
      allVehiclesForDialog: parentVehicles,
      initialStatus: status,
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
      payments: [],
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
  
  const formSubmitWrapper = (values: ServiceFormValues) => {
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

  return (
    <>
        <FormProvider {...form}>
            <form ref={ref} id="service-form" onSubmit={handleSubmit(formSubmitWrapper)} className="flex flex-col flex-grow overflow-hidden">
                <div className="flex-grow overflow-y-auto space-y-6">
                    <ServiceDetailsHeader technicians={technicians} serviceTypes={serviceTypes} />

                    <VehicleSelectionCard
                        isReadOnly={props.isReadOnly}
                        localVehicles={parentVehicles}
                        onVehicleSelected={(v) => setValue('vehicleIdentifier', v?.licensePlate)}
                        onOpenNewVehicleDialog={handleOpenNewVehicleDialog}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                      <div className="lg:col-span-3">
                        <ServiceItemsList
                            inventoryItems={invItems}
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
```
