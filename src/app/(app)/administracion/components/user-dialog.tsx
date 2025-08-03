
"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { UserForm, type UserFormValues } from "./user-form";
import type { User, AppRole } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user?: User | null;
  roles: AppRole[];
  onSave: (data: UserFormValues) => Promise<void>;
}

export function UserDialog({ open, onOpenChange, user, roles, onSave }: UserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error al guardar", description: "No se pudo guardar el usuario.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? "Editar Usuario" : "Nuevo Usuario"}
      description={user ? "Actualiza los detalles del usuario." : "Completa la información para un nuevo miembro del equipo."}
      formId="user-form"
      isSubmitting={isSubmitting}
      submitButtonText={user ? "Actualizar Usuario" : "Crear Usuario"}
      dialogContentClassName="sm:max-w-lg"
    >
      <UserForm
        id="user-form"
        initialData={user}
        roles={roles}
        onSubmit={handleSubmit}
      />
    </FormDialog>
  );
}
