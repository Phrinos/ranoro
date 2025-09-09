// src/app/(app)/servicios/components/ServiceForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, Ban, Trash2, BrainCircuit, LogIn, Calendar, Plus, DollarSign } from 'lucide-react';
import { serviceFormSchema, ServiceFormValues } from '@/schemas/service-form';
import { ServiceRecord, Vehicle, User, InventoryItem, ServiceTypeRecord, InventoryCategory, Supplier } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { useToast } from '@/hooks/use-toast';
import { enhanceText } from '@/ai/flows/text-enhancement-flow';
import { SignatureDialog } from './signature-dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ServiceSummary } from './ServiceSummary';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate, addMonths, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceItemsList } from './ServiceItemsList';
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { SafetyChecklist } from './SafetyChecklist';
import { PhotoReportTab } from './PhotoReportTab';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';

interface ServiceFormProps {
  initialData: ServiceRecord | null;
  vehicles: Vehicle[];
  technicians: User[];
  inventoryItems: InventoryItem[];
  serviceTypes: ServiceTypeRecord[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  serviceHistory: ServiceRecord[];
  onSave: (data: ServiceFormValues) => Promise<void>;
  onComplete?: (data: ServiceFormValues) => void;
  onVehicleCreated?: (newVehicle: VehicleFormValues) => Promise<void>;
  onCancel?: () => void;
  mode: 'service' | 'quote';
}

export function ServiceForm({
  initialData,
  vehicles,
  technicians,
  inventoryItems,
  serviceTypes,
  categories,
  suppliers,
  serviceHistory,
  onSave,
  onComplete,
  onVehicleCreated,
  onCancel,
  mode,
}: ServiceFormProps) {
  const { toast } = useToast();
  const methods = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      ...initialData,
      notes: initialData?.notes ?? '',
      serviceDate: initialData?.serviceDate ? new Date(initialData.serviceDate) : new Date(),
      appointmentDateTime: initialData?.appointmentDateTime ? new Date(initialData.appointmentDateTime) : undefined,
      receptionDateTime: initialData?.receptionDateTime ? new Date(initialData.receptionDateTime) : undefined,
      deliveryDateTime: initialData?.deliveryDateTime ? new Date(initialData.deliveryDateTime) : undefined,
    },
  });

  const { handleSubmit, getValues, setValue, watch, formState: { isSubmitting }, reset } = methods;

  const watchedStatus = watch('status');
  
  const handleFormSubmit = async (values: ServiceFormValues) => {
    if (values.status === 'Entregado' && initialData?.status !== 'Entregado') {
      toast({
        title: "Acción Requerida",
        description: "Para finalizar un servicio, utiliza el botón 'Completar y Cobrar'. No se puede cambiar el estado a 'Entregado' manualmente.",
        variant: "destructive",
        duration: 7000,
      });
      setValue('status', initialData?.status || 'En Taller'); // Revert status
      return;
    }
    await onSave(values);
  };
  
  const handleCompleteClick = () => {
    if (onComplete) {
      onComplete(getValues());
    }
  };

  const onValidationErrors = (errors: any) => {
    console.log("Validation Errors:", errors);
    toast({
        title: "Error de Validación",
        description: "Por favor, corrija los errores antes de guardar.",
        variant: "destructive",
    });
  };

  return (
    <FormProvider {...methods}>
      <form id="service-form" onSubmit={handleSubmit(handleFormSubmit, onValidationErrors)}>
          <div className="p-6 space-y-6">
             {/* Form content */}
          </div>
        <footer className="sticky bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
                <div>
                  {onCancel && (
                    <ConfirmDialog
                      triggerButton={<Button variant="destructive" type="button"><Ban className="mr-2 h-4 w-4" />{mode === 'quote' ? 'Eliminar' : 'Cancelar'}</Button>}
                      title={mode === 'quote' ? '¿Eliminar cotización?' : '¿Cancelar servicio?'}
                      description={mode === 'quote' ? 'Esto es permanente.' : 'El servicio se marcará como cancelado.'}
                      onConfirm={onCancel}
                      confirmText={mode === 'quote' ? 'Sí, Eliminar' : 'Sí, Cancelar'}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                   <Button type="button" variant="outline" onClick={() => reset(initialData || {})}>Descartar</Button>
                   {initialData?.id && watchedStatus === 'En Taller' && onComplete ? (
                     <Button type="button" onClick={handleCompleteClick} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                       {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <DollarSign className="mr-2 h-4 w-4"/>}
                       Completar y Cobrar
                     </Button>
                   ) : (
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                        {initialData?.id ? 'Guardar Cambios' : 'Crear Registro'}
                     </Button>
                   )}
                </div>
            </div>
      </footer>
      </form>
    </FormProvider>
  );
}
