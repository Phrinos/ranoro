

"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdministrativeStaffForm, type AdministrativeStaffFormValues } from "./administrative-staff-form";
import type { AdministrativeStaff } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface AdministrativeStaffDialogProps {
  trigger?: React.ReactNode;
  staffMember?: AdministrativeStaff | null;
  onSave?: (data: AdministrativeStaffFormValues) => Promise<void>;
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
        await onSave(values);
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
      {open && (
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{staffMember ? "Editar Miembro del Staff Administrativo" : "Nuevo Miembro del Staff Administrativo"}</DialogTitle>
            <DialogDescription>
              {staffMember ? "Actualiza los detalles del perfil del staff." : "Completa la información para un nuevo miembro del staff."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto -mx-6 px-6">
            <AdministrativeStaffForm
              initialData={staffMember}
              onSubmit={handleSubmit}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
