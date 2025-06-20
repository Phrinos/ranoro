
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
        description: "No se pudo guardar el registro del personal. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      {open && (
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{staffMember ? "Editar Personal Administrativo" : "Nuevo Personal Administrativo"}</DialogTitle>
            <DialogDescription>
              {staffMember ? "Actualiza los detalles del perfil del personal." : "Completa la información para un nuevo miembro del personal."}
            </DialogDescription>
          </DialogHeader>
          <AdministrativeStaffForm
            initialData={staffMember}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
