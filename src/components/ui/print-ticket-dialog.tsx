

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
        "sm:max-w-md max-h-[90vh] flex flex-col p-0",
        dialogContentClassName
      )}>
        <DialogHeader className="p-4 sm:p-6 text-left border-b no-print flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto bg-muted/30 p-2 sm:p-4 print:p-0 print:bg-white flex justify-center">
            <div className="printable-content print:!bg-white print-format-receipt">
                 {children}
            </div>
        </div>

        {/* Fixed Footer */}
        {footerActions && (
          <DialogFooter className="p-4 flex-col sm:flex-row sm:justify-end gap-2 no-print flex-shrink-0 border-t bg-background">
              {footerActions}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
