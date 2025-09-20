
// src/app/(app)/servicios/components/ServiceFormFooter.tsx
"use client";

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Ban, DollarSign } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ServiceFormValues } from '@/schemas/service-form';
import type { ServiceRecord } from '@/types';

interface ServiceFormFooterProps {
  formId: string;
  onCancel?: () => void;
  onComplete?: (values: ServiceFormValues) => void;
  mode: 'service' | 'quote';
  initialData: ServiceRecord | null;
  isSubmitting: boolean;
}

export const ServiceFormFooter = ({ formId, onCancel, onComplete, mode, initialData, isSubmitting }: ServiceFormFooterProps) => {
    const { getValues, reset } = useFormContext<ServiceFormValues>();
    const isEditMode = !!initialData?.id;
    const { status, payments, serviceItems } = useWatch();

    const isQuoteMode = status === 'Cotizacion';
    const isScheduledMode = status === 'Agendado';

    const totalCost = serviceItems?.reduce((acc, item) => acc + (Number(item.sellingPrice) || 0), 0) || 0;
    const totalPaid = payments?.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;
    const isPaymentComplete = totalPaid >= totalCost && totalCost > 0;

    let cancelTexts = {
        button: 'Cancelar Servicio',
        title: '¿Cancelar servicio?',
        description: 'El servicio se marcará como cancelado y los insumos se devolverán al inventario.',
        confirm: 'Sí, Cancelar Servicio'
    };

    if (isQuoteMode) {
        cancelTexts = {
            button: 'Eliminar Cotización',
            title: '¿Eliminar cotización?',
            description: 'Esta acción es permanente y no se puede deshacer.',
            confirm: 'Sí, Eliminar'
        };
    } else if (isScheduledMode) {
        cancelTexts = {
            button: 'Cancelar Cita',
            title: '¿Cancelar cita?',
            description: 'La cita se cancelará y el registro volverá a ser una cotización.',
            confirm: 'Sí, Cancelar Cita'
        };
    }


    return (
        <footer className="sticky bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur-sm hidden md:block">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onCancel && (
                <ConfirmDialog
                  triggerButton={<Button variant="destructive" type="button" className="w-full sm:w-auto"><Ban className="mr-2 h-4 w-4" />{cancelTexts.button}</Button>}
                  title={cancelTexts.title}
                  description={cancelTexts.description}
                  onConfirm={onCancel}
                  confirmText={cancelTexts.confirm}
                />
              )}
              <Button type="button" variant="outline" onClick={() => reset(initialData || {})} className="w-full sm:w-auto">Descartar</Button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
               {isEditMode && onComplete && status !== 'Entregado' && status !== 'Cancelado' && (
                 <Button 
                   type="button" 
                   onClick={() => onComplete(getValues())} 
                   disabled={isSubmitting || !isPaymentComplete} 
                   variant="outline" 
                   className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto"
                   title={!isPaymentComplete ? 'Debe registrar el pago completo para poder entregar.' : 'Entregar y finalizar el servicio'}
                 >
                    <DollarSign className="mr-2 h-4 w-4"/> Entregar y Cobrar
                 </Button>
               )}
              <Button type="submit" form={formId} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                Guardar
              </Button>
            </div>
          </div>
        </footer>
    );
};
