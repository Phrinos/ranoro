
"use client";

import React from 'react';
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
        "print:hidden", // Hide the entire dialog frame when printing
        dialogContentClassName
      )}>
        <DialogHeader className="print:hidden">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {/* This wrapper is now what gets printed */}
        <div id="printable-area" className="my-4 max-h-[70vh] overflow-y-auto bg-muted/50 p-4 rounded-md print:overflow-visible print:max-h-none print:bg-transparent print:p-0 print:m-0">
          {children}
        </div>

        {footerActions && (
          <DialogFooter className="print:hidden sm:justify-end">
            <div className="flex flex-col sm:flex-row gap-2">
              {footerActions}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
