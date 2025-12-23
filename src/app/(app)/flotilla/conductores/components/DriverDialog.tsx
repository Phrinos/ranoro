// src/app/(app)/flotilla/conductores/components/DriverDialog.tsx
"use client";

import React from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { DriverForm, type DriverFormValues } from './DriverForm';
import type { Driver } from '@/types';

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver?: Driver | null;
  onSave: (data: DriverFormValues) => Promise<void>;
}

export function DriverDialog({ open, onOpenChange, driver, onSave }: DriverDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={driver ? "Editar Conductor" : "Nuevo Conductor"}
      description={driver ? "Actualiza los detalles del conductor." : "Completa la información para un nuevo conductor."}
      formId="driver-form"
      isSubmitting={false} // The parent component will manage submission state if needed
      submitButtonText={driver ? "Actualizar" : "Crear Conductor"}
      dialogContentClassName="sm:max-w-lg"
    >
      <DriverForm
        id="driver-form"
        initialData={driver}
        onSubmit={onSave}
      />
    </FormDialog>
  );
}
