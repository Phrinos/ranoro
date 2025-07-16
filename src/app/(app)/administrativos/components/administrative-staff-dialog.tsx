
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdministrativeStaffForm, type AdministrativeStaffFormValues } from "./administrative-staff-form";
import type { AdministrativeStaff } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';

interface AdministrativeStaffDialogProps {
  trigger?: React.ReactNode;
  staffMember?: AdministrativeStaff | null;
  onSave?: (data: AdministrativeStaffFormValues) => void;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function AdministrativeStaffDialog({ 
  trigger, 
  staffMember, 
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen 
}: AdministrativeStaffDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (values: AdministrativeStaffFormValues) => {
    try {
      if (onSave) {
        onSave(values); // The parent now handles async logic and toast
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving administrative staff:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el registro del staff administrativo. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{staffMember ? "Editar Miembro del Staff Administrativo" : "Nuevo Miembro del Staff Administrativo"}</DialogTitle>
          <DialogDescription>
            {staffMember ? "Actualiza los detalles del perfil del staff." : "Completa la información para un nuevo miembro del staff."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
          <AdministrativeStaffForm
            initialData={staffMember}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </div>
         <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="admin-staff-form">
              {staffMember ? "Actualizar Staff" : "Crear Staff"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
