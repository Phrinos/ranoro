

"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { ServiceForm } from './form';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord, User, ServiceTypeRecord } from '@/types';
import { useToast } from '@/hooks/use-toast'; 
import { operationsService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';


interface ServiceDialogProps {
  trigger?: React.ReactNode;
  service?: ServiceRecord | null; 
  quote?: Partial<QuoteRecord> | null; // For quote mode initialization
  vehicles: Vehicle[]; 
  technicians: Technician[]; 
  inventoryItems: InventoryItem[]; 
  serviceTypes: ServiceTypeRecord[];
  onSave?: (data: ServiceRecord | QuoteRecord) => Promise<void>; 
  isReadOnly?: boolean; 
  open?: boolean; 
  onOpenChange?: (isOpen: boolean) => void; 
  onVehicleCreated?: (newVehicle: Omit<Vehicle, 'id'>) => void; 
  mode?: 'service' | 'quote'; // New mode prop
  onDelete?: (id: string) => void; // For quote deletion
  onCancelService?: (serviceId: string, reason: string) => void;
  onViewQuoteRequest?: (serviceId: string) => void;
}

export function ServiceDialog({ 
  trigger, 
  service, 
  quote,
  vehicles, 
  technicians, 
  inventoryItems, 
  serviceTypes,
  onSave, 
  isReadOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onVehicleCreated,
  mode = 'service', // Default to service mode
}: ServiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();
  const [cancellationReason, setCancellationReason] = useState("");

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const internalOnSave = async (formData: ServiceRecord | QuoteRecord) => {
    if (isReadOnly) {
      onOpenChange(false);
      return;
    }

    try {
        const savedRecord = await operationsService.saveService(formData);
        toast({ title: `Registro ${formData.id ? 'actualizado' : 'creado'} con éxito.` });
        if (onSave) {
            await onSave(savedRecord);
        }
        onOpenChange(false);
    } catch (error) {
        console.error(`Error saving ${mode} from dialog:`, error);
        toast({
            title: `Error al Guardar ${mode === 'quote' ? 'Cotización' : 'Servicio'}`,
            description: `Ocurrió un problema al intentar guardar desde el diálogo.`,
            variant: "destructive",
        });
    }
  };
  
  const getDynamicTitles = () => {
    const currentRecord = service || quote;
    const status = currentRecord?.status;

    if (isReadOnly) {
        switch (status) {
            case 'Cotizacion': return { title: 'Detalles de la Cotización', description: 'Visualizando los detalles de la cotización.' };
            case 'Agendado': return { title: 'Detalles de la Cita', description: 'Visualizando los detalles de la cita agendada.' };
            default: return { title: 'Detalles del Servicio', description: 'Visualizando los detalles de la orden de servicio.' };
        }
    }

    if (currentRecord?.id) { // Editing existing record
        switch (status) {
            case 'Cotizacion': return { title: 'Editar Cotización', description: 'Actualiza los detalles de la cotización.' };
            case 'Agendado': return { title: 'Editar Cita', description: 'Actualiza los detalles de la cita.' };
            default: return { title: 'Editar Servicio', description: 'Actualiza los detalles de la orden de servicio.' };
        }
    }
    
    // Creating new record
    switch (status) {
        case 'Cotizacion': return { title: 'Nueva Cotización', description: 'Completa la información para una nueva cotización.' };
        case 'Agendado': return { title: 'Nueva Cita', description: 'Completa la información para una nueva cita.' };
        case 'En Taller': return { title: 'Nuevo Servicio', description: 'Completa la información para una nueva orden de servicio.' };
        default: return { title: 'Nuevo Registro', description: 'Selecciona un estado para continuar.' };
    }
  };


  const { title: dialogTitle, description: dialogDescription } = getDynamicTitles();
  const showCancelButton = !isReadOnly && service?.id && service.status !== 'Entregado' && service.status !== 'Cancelado';
      
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <ServiceForm
          initialDataService={service}
          vehicles={vehicles} 
          technicians={technicians}
          inventoryItems={inventoryItems}
          serviceTypes={serviceTypes}
          onSubmit={internalOnSave}
          onClose={() => onOpenChange(false)}
          isReadOnly={isReadOnly}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  );
}
