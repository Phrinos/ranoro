// src/app/(app)/servicios/components/ServiceFormFooter.tsx
"use client";

import React, { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Ban, DollarSign } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ServiceFormValues } from '@/schemas/service-form';
import type { ServiceRecord } from '@/types';

interface ServiceFormFooterProps {
  formId: string;
  onCancel?: () => void;
  onComplete?: (values: ServiceFormValues) => void; // Abre PaymentDetailsDialog
  mode: 'service' | 'quote';
  initialData: ServiceRecord | null;
  isSubmitting: boolean;
}

// Parser seguro para números que pueden venir como string con $, comas, etc.
const toNumber = (v: any) =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

export const ServiceFormFooter = ({
  formId,
  onCancel,
  onComplete,
  mode,
  initialData,
  isSubmitting
}: ServiceFormFooterProps) => {

  const { control, getValues, reset } = useFormContext<ServiceFormValues>();

  // Observa SOLO lo necesario (más estable que usar todo el form)
  const [status, payments = [], serviceItems = []] = useWatch({
    control,
    name: ['status', 'payments', 'serviceItems'],
  }) as [ServiceFormValues['status'], ServiceFormValues['payments'], ServiceFormValues['serviceItems']];

  const isEditMode = !!initialData?.id;
  const isQuoteMode = status === 'Cotizacion';
  const isScheduledMode = status === 'Agendado';

  // Total del servicio (precio x cantidad - descuento si existe)
  const totalCost = useMemo(() => {
    return (serviceItems || []).reduce((acc, item: any) => {
      const qty = toNumber(item?.quantity ?? 1);
      const price = toNumber(item?.sellingPrice);
      const discount = toNumber(item?.discount); // si tu esquema no maneja descuento, queda en 0
      const line = Math.max(price * (qty || 1) - discount, 0);
      return acc + line;
    }, 0);
  }, [serviceItems]);

  // Total pagado (normaliza strings)
  const totalPaid = useMemo(() => {
    return (payments || []).reduce((acc: number, p: any) => acc + toNumber(p?.amount), 0);
  }, [payments]);

  const isPaymentComplete = totalCost > 0 && totalPaid >= totalCost;

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

  // Opcional: si tu initialData no está 100% alineada al esquema del form,
  // crea un "normalizeServiceFormValues(initialData)" y úsalo aquí.
  const handleDiscard = () => reset((initialData as unknown as ServiceFormValues) || {});

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
              onConfirm={onCancel}
              confirmText={cancelTexts.confirm}
            />
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            className="w-full sm:w-auto"
          >
            Descartar
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isEditMode && onComplete && status !== 'Entregado' && status !== 'Cancelado' && (
            <Button
              type="button"
              onClick={() => onComplete(getValues({ nest: true }))}
              disabled={isSubmitting || !isPaymentComplete}
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto"
              title={
                !isPaymentComplete
                  ? 'Debe registrar el pago completo para poder entregar.'
                  : 'Entregar y finalizar el servicio'
              }
            >
              <DollarSign className="mr-2 h-4 w-4" /> Entregar y Cobrar
            </Button>
          )}

          <Button
            type="submit"
            form={formId}
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
