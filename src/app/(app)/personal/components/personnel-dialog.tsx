

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PersonnelForm, type PersonnelFormValues } from "./personnel-form";
import type { Personnel, Area } from "@/types"; // Changed AppRole to Area
import { Button } from '@/components/ui/button';

interface PersonnelDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  personnel?: Personnel | null;
  onSave: (data: PersonnelFormValues, id?: string) => void;
  appRoles: Area[]; // Changed AppRole to Area
}

export function PersonnelDialog({ open, onOpenChange, personnel, onSave, appRoles }: PersonnelDialogProps) {
  
  const handleSubmit = (values: PersonnelFormValues) => {
    onSave(values, personnel?.id);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>{personnel ? "Editar Personal" : "Nuevo Personal"}</DialogTitle>
          <DialogDescription>
            {personnel ? "Actualiza los detalles del miembro del equipo." : "Completa la información para un nuevo miembro del equipo."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
            <PersonnelForm
              id="personnel-form"
              initialData={personnel}
              onSubmit={handleSubmit}
              appRoles={appRoles}
            />
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button type="submit" form="personnel-form">
                {personnel ? "Actualizar Personal" : "Crear Personal"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
