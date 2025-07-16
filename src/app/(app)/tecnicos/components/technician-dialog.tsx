
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { TechnicianForm, type TechnicianFormValues } from "./technician-form";
import type { Technician } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';

interface TechnicianDialogProps {
  trigger?: React.ReactNode;
  technician?: Technician | null;
  onSave?: (data: TechnicianFormValues) => void;
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
        onSave(values); // Parent handles async and toast
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving technician:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el miembro del staff técnico. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && !isControlled && <DialogTrigger asChild onClick={() => onOpenChange(true)}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{technician ? "Editar Miembro del Staff Técnico" : "Nuevo Miembro del Staff Técnico"}</DialogTitle>
          <DialogDescription>
            {technician ? "Actualiza los detalles del perfil del miembro del staff técnico." : "Completa la información para un nuevo miembro del staff técnico."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
          <TechnicianForm
            initialData={technician}
            onSubmit={handleSubmit}
            onClose={() => onOpenChange(false)}
          />
        </div>
         <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="technician-form">
              {technician ? "Actualizar Staff" : "Crear Staff"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
