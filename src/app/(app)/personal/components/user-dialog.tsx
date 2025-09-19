

"use client";

import React, { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { UserForm, type UserFormValues } from "./user-form";
import type { User, AppRole } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Archive, ArchiveRestore } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user?: User | null;
  roles: AppRole[];
  onSave: (data: UserFormValues) => Promise<void>;
  onArchive: (userId: string, archive: boolean) => Promise<void>;
}

export function UserDialog({ open, onOpenChange, user, roles, onSave, onArchive }: UserDialogProps) {
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

  const handleArchive = () => {
    if (user && user.id) {
      onArchive(user.id, !user.isArchived);
    }
  };

  const dialogTitle = user ? "Editar Usuario" : "Nuevo Usuario";
  const dialogDescription = user ? "Actualiza los detalles del usuario." : "Completa la información para un nuevo miembro del equipo.";
  const submitButtonText = user ? "Actualizar Usuario" : "Crear Usuario";
  
  const isArchived = user?.isArchived || false;
  
  const archiveButton = user && user.id ? (
    <ConfirmDialog
        triggerButton={
            <Button variant={isArchived ? "outline" : "destructive"} type="button">
                {isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                {isArchived ? "Restaurar Usuario" : "Archivar Usuario"}
            </Button>
        }
        title={`¿${isArchived ? 'Restaurar' : 'Archivar'} a ${user.name}?`}
        description={isArchived ? 'El usuario volverá a estar activo en el sistema.' : 'El usuario no podrá iniciar sesión y no aparecerá en las listas activas.'}
        onConfirm={handleArchive}
        confirmText={isArchived ? 'Sí, Restaurar' : 'Sí, Archivar'}
    />
  ) : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      formId="user-form"
      isSubmitting={isSubmitting}
      submitButtonText={submitButtonText}
      dialogContentClassName="sm:max-w-lg"
      customFooterContent={archiveButton}
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
