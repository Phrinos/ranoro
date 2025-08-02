
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { UserForm, type UserFormValues } from "./user-form";
import type { User, AppRole } from "@/types";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user?: User | null;
  roles: AppRole[];
  onSave: (data: UserFormValues) => Promise<void>;
}

export function UserDialog({ open, onOpenChange, user, roles, onSave }: UserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          <DialogDescription>
            {user ? "Actualiza los detalles del usuario." : "Completa la información para un nuevo miembro del equipo."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
            <UserForm
              id="user-form"
              initialData={user}
              roles={roles}
              onSubmit={onSave}
            />
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button type="submit" form="user-form">
                {user ? "Actualizar Usuario" : "Crear Usuario"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
