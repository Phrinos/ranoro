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
import { TechnicianForm } from "./technician-form";
import type { Technician } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface TechnicianDialogProps {
  trigger: React.ReactNode;
  technician?: Technician | null;
  onSave?: (data: any) => Promise<void>;
}

export function TechnicianDialog({ trigger, technician, onSave }: TechnicianDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (values: any) => {
    try {
      if (onSave) {
        await onSave(values);
      }
      toast({
        title: `Técnico ${technician ? 'actualizado' : 'creado'} con éxito`,
        description: `El perfil de ${values.name} ha sido ${technician ? 'actualizado' : 'registrado'}.`,
      });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
