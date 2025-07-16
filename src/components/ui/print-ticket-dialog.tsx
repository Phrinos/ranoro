
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
          <div className="print:hidden flex-shrink-0 border-l bg-background p-4 flex flex-col gap-4 w-auto">
            <DialogHeader className="p-0 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 !justify-start">
              {footerActions}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
