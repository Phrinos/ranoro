
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormDialogProps {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  formId: string;
  isSubmitting: boolean;
  children: React.ReactNode;
  submitButtonText?: string;
  dialogContentClassName?: string;
}

export function FormDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  formId,
  isSubmitting,
  children,
  submitButtonText = "Guardar",
  dialogContentClassName,
}: FormDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("sm:max-w-lg max-h-[90vh] flex flex-col p-0", dialogContentClassName)}>
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4">
          {children}
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background flex-shrink-0 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Guardando..." : submitButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
