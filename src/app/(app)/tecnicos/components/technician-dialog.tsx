
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
import { TechnicianForm, type TechnicianFormValues } from "./technician-form";
import type { Technician } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface TechnicianDialogProps {
  trigger?: React.ReactNode;
  technician?: Technician | null;
  onSave?: (data: TechnicianFormValues) => Promise<void>;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function TechnicianDialog({ 
  trigger, 
  technician, 
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen 
}: TechnicianDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? setControlledOpen : setUncontrolledOpen;

  const handleSubmit = async (values: TechnicianFormValues) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      // Toast message will be handled by the caller (Page or Detail Page)
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving technician:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el técnico. Intente de nuevo.",
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
            <DialogTitle>{technician ? "Editar Técnico" : "Nuevo Técnico"}</DialogTitle>
            <DialogDescription>
              {technician ? "Actualiza los detalles del perfil del técnico." : "Completa la información para un nuevo técnico."}
            </DialogDescription>
          </DialogHeader>
          <TechnicianForm
            initialData={technician}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
