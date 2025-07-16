

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode; 
  onDialogClose?: () => void; 
  dialogContentClassName?: string;
  footerActions?: React.ReactNode;
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  description = "Contenido del documento listo para imprimir o compartir.",
  children,
  onDialogClose,
  dialogContentClassName = "",
  footerActions,
}: PrintTicketDialogProps) {

  const handleClose = () => {
    onOpenChange(false);
    if (onDialogClose) {
      onDialogClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(true);
    }}>
      <DialogContent className={cn(
        "sm:max-w-2xl max-h-[90vh] flex flex-row p-0",
        dialogContentClassName
      )}>
        <div className="flex-grow overflow-y-auto bg-muted/30 p-2 sm:p-4 print:p-0 print:bg-white">
            <div className="printable-content print-format-receipt">
                 {children}
            </div>
        </div>

        {footerActions && (
          <div
            className={cn(
              "print:hidden flex-shrink-0 border-l bg-background p-4",
              "flex flex-col justify-between w-56"
            )}
          >
            {/* header fijo en la parte superior */}
            <DialogHeader className="p-0 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {/* botones al fondo, en columna y alineados a la derecha */}
            <DialogFooter className="flex flex-col gap-3 items-end sm:flex-col">
              {footerActions}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
