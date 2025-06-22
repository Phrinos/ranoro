
"use client";

import React, { useEffect } from 'react'; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode; 
  onDialogClose?: () => void; 
  autoPrint?: boolean; 
  printButtonText?: string;
  dialogContentClassName?: string;
  footerActions?: React.ReactNode; // New prop for additional buttons
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  children,
  onDialogClose,
  autoPrint = false,
  printButtonText = "Imprimir",
  dialogContentClassName = "",
  footerActions
}: PrintTicketDialogProps) {

  useEffect(() => {
    if (autoPrint && open) {
      const timer = setTimeout(() => {
        window.print();
      }, 300); 
      return () => clearTimeout(timer);
    }
  }, [autoPrint, open]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onDialogClose) {
      onDialogClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            handleClose();
        } else {
            onOpenChange(true);
        }
    }}>
      <DialogContent className={cn(
        "sm:max-w-xl", // Adjusted for quote preview
        dialogContentClassName?.includes('quote') && "sm:max-w-4xl",
        "print:max-w-full print:border-none print:shadow-none print:p-0",
        dialogContentClassName
      )}>
        <DialogHeader className="print:hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="my-4 max-h-[70vh] overflow-y-auto bg-muted/50 p-2 sm:p-4 rounded-md print:overflow-visible print:max-h-none print:bg-transparent">
          <div className="ticket-container printable-content">
            {children} 
          </div>
        </div>

        <DialogFooter className="print:hidden sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            {footerActions}
          </div>
          <Button type="button" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> {printButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
