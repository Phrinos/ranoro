
// src/app/(app)/servicios/components/service-dialog.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ServiceForm } from './ServiceForm';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceFormSchema, ServiceFormValues } from '@/schemas/service-form';
import { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier } from '@/types';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';
import { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  users: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<ServiceRecord | void>;
  onSaveSuccess: (service: ServiceRecord) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<Vehicle>;
  mode: 'service' | 'quote';
  activeTab: string;
  onTabChange: (tab: string) => void;
  isChecklistWizardOpen: boolean;
  setIsChecklistWizardOpen: (isOpen: boolean) => void;
  onOpenNewVehicleDialog: (plate?: string) => void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  onSaveSuccess,
  mode,
  ...rest
}: ServiceDialogProps) {
  const { isExpanded } = useSidebar();
  
  // Forzar valores por defecto para un nuevo servicio
  const defaultValues: Partial<ServiceFormValues> = initialData ? {
    ...initialData,
    status: initialData.status || 'Cotizacion',
  } : {
    status: 'Cotizacion', // ¡Estado por defecto explícito!
    serviceDate: new Date().toISOString(),
    serviceItems: [],
    payments: [],
  };

  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues,
    mode: 'onBlur', // Validar solo cuando el usuario deja el campo
    reValidateMode: 'onChange',
  });
  
  const { reset } = methods;

  React.useEffect(() => {
    // Resetear el formulario con los valores correctos cada vez que se abre
    if (open) {
      reset(defaultValues);
    }
  }, [open, initialData, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
            "max-w-4xl h-full flex flex-col transition-all duration-300", 
            isExpanded ? 'lg:max-w-6xl' : 'lg:max-w-4xl'
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Nueva'} {mode === 'quote' ? 'Cotización' : 'Servicio'}</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <ServiceForm
            initialData={initialData}
            onSave={onSave}
            onSaveSuccess={onSaveSuccess}
            onCancel={() => onOpenChange(false)}
            mode={mode}
            {...rest}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
