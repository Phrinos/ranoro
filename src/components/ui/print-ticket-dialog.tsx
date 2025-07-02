
"use client";

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  description = "Contenido del documento listo para imprimir.",
  children,
  onDialogClose,
  dialogContentClassName = "",
  footerActions
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
        "sm:max-w-4xl",
        "print:max-w-full print:border-none print:shadow-none print:p-0",
        dialogContentClassName
      )}>
        <DialogHeader className="print:hidden">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="my-4 max-h-[70vh] overflow-y-auto bg-muted/50 p-4 rounded-md print:overflow-visible print:max-h-none print:bg-transparent print:p-0 print:m-0">
          {children}
        </div>

        <DialogFooter className="print:hidden sm:justify-end">
          <div className="flex flex-col sm:flex-row gap-2">
            {footerActions}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
