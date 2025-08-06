
/* app/(app)/servicios/components/service-form.tsx */
'use client'

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider, useFormContext } from "react-hook-form"

import { useCallback, useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'

import type {
  ServiceRecord, Vehicle, Technician, InventoryItem,
  QuoteRecord, User, ServiceTypeRecord, InventoryCategory, Supplier
} from '@/types' 

import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { VehicleSelectionCard } from './components/VehicleSelectionCard'
import { serviceFormSchema } from '@/schemas/service-form';
import { useServiceTotals } from '@/hooks/use-service-form-hooks'
import { inventoryService } from "@/lib/services";
import type { InventoryItemFormValues } from "../../inventario/components/inventory-item-form";
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
      serviceItems: [{
        id: nanoid(),
        name: firstType,
        price: undefined,
        suppliesUsed: [],
      }],
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
