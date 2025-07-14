

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
        "sm:max-w-md", // Default width
        "flex flex-col max-h-[90vh]", // Ensure dialog doesn't overflow viewport
        dialogContentClassName 
      )}>
        <DialogHeader className="print:hidden flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto bg-muted/30 p-2 sm:p-4 rounded-md">
            <div id="printable-area" className="w-[8.5in] h-auto bg-white mx-auto my-4 shadow-lg printable-content">
                {children}
            </div>
        </div>

        {footerActions && (
          <DialogFooter className="print:hidden flex-shrink-0 flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            {footerActions}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
