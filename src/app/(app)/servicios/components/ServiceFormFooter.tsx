// src/app/(app)/servicios/components/ServiceFormFooter.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Ban, DollarSign } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ServiceFormValues } from '@/schemas/service-form';
import type { ServiceRecord } from '@/types';
import { Textarea } from '@/components/ui/textarea';

interface ServiceFormFooterProps {
  onCancel: (reason?: string) => void;
  onComplete?: () => void;
  onSaveClick: () => void;
  mode: 'service' | 'quote';
  initialData: ServiceRecord | null;
  isSubmitting: boolean;
}

const toNumber = (v: any) =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

export const ServiceFormFooter = ({
  onCancel,
  onComplete,
  onSaveClick,
  mode,
  initialData,
  isSubmitting
}: ServiceFormFooterProps) => {
  const { control } = useFormContext<ServiceFormValues>();
  const [cancellationReason, setCancellationReason] = useState("");

  const [status, serviceItems = []] = useWatch({
    control,
    name: ['status', 'serviceItems'],
  }) as [ServiceFormValues['status'], ServiceFormValues['serviceItems']];

  const isEditMode = !!initialData?.id;
  const isQuoteMode = status === 'Cotizacion';
  const isScheduledMode = status === 'Agendado';

  const totalCost = useMemo(() => {
    return (serviceItems || []).reduce((acc, item: any) => {
      const qty = toNumber(item?.quantity ?? 1);
      const price = toNumber(item?.sellingPrice);
      const discount = toNumber(item?.discount);
      const line = Math.max(price * (qty || 1) - discount, 0);
      return acc + line;
    }, 0);
  }, [serviceItems]);

  const canOpenPaymentModal =
    isEditMode &&
    status !== 'Entregado' &&
    status !== 'Cancelado' &&
    totalCost > 0;

  let cancelTexts = {
    button: 'Cancelar Servicio',
    title: '¿Cancelar servicio?',
    description: 'El servicio se marcará como cancelado. Por favor, especifique un motivo.',
    confirm: 'Sí, Cancelar Servicio'
  };

  if (isQuoteMode) {
    cancelTexts = {
      button: 'Eliminar Cotización',
      title: '¿Eliminar cotización?',
      description: 'Esta acción es permanente y no se puede deshacer. No se requiere un motivo.',
      confirm: 'Sí, Eliminar'
    };
  } else if (isScheduledMode) {
    cancelTexts = {
      button: 'Cancelar Cita',
      title: '¿Cancelar cita?',
      description: 'La cita se cancelará y el registro volverá a ser una cotización. Por favor, especifique un motivo.',
      confirm: 'Sí, Cancelar Cita'
    };
  }
  
  const handleConfirmCancel = () => {
    onCancel(cancellationReason);
    setCancellationReason("");
  };

  return (
    <footer className="sticky bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur-sm hidden md:block">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onCancel && (
            <ConfirmDialog
              triggerButton={
                <Button variant="destructive" type="button" className="w-full sm:w-auto">
                  <Ban className="mr-2 h-4 w-4" />
                  {cancelTexts.button}
                </Button>
              }
              title={cancelTexts.title}
              description={cancelTexts.description}
              onConfirm={handleConfirmCancel}
              confirmText={cancelTexts.confirm}
            >
              {!isQuoteMode && (
                <Textarea
                  placeholder="Motivo de la cancelación..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="mt-4"
                />
              )}
            </ConfirmDialog>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isEditMode && onComplete && status !== 'Entregado' && status !== 'Cancelado' && (
            <Button
              type="button"
              onClick={onComplete}
              disabled={isSubmitting || !canOpenPaymentModal}
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto"
              title={
                !canOpenPaymentModal
                  ? (totalCost <= 0
                      ? 'Agrega al menos un trabajo o importe mayor a $0 para iniciar el cobro.'
                      : 'No puedes completar un servicio ya entregado o cancelado.')
                  : 'Abrir el modal para capturar el pago y completar el servicio'
              }
            >
              <DollarSign className="mr-2 h-4 w-4" /> Entregar y Cobrar
            </Button>
          )}
          
          <Button type="button" variant="outline" onClick={() => (window.history.length > 1 ? window.history.back() : router.push('/servicios'))} disabled={isSubmitting}>
              Cancelar
          </Button>

          <Button
            type="button" // Change from submit to button to prevent default form submission
            onClick={onSaveClick}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>
    </footer>
  );
};
