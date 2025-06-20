
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

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode; 
  onDialogClose?: () => void; 
  autoPrint?: boolean; 
  printButtonText?: string; // New prop for custom print button text
  dialogContentClassName?: string; // New prop for custom dialog content class
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  children,
  onDialogClose,
  autoPrint = false,
  printButtonText = "Imprimir Ticket", // Default value
  dialogContentClassName = "printable-ticket-dialog" // Default class for tickets
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
        onOpenChange(isOpen);
        if(!isOpen && onDialogClose) {
            onDialogClose();
        }
    }}>
      <DialogContent className={cn(
        "sm:max-w-md print:max-w-full print:border-none print:shadow-none print:p-0",
        dialogContentClassName // Apply custom class here
      )}>
        <DialogHeader className="print:hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="ticket-container my-4">
          {children} 
        </div>

        {/* Footer is now conditional based on children containing their own actions or if this is used */}
        {/* If children include custom actions, this footer might be redundant or need adjustment */}
        {/* For now, keeping default footer if no custom actions are passed implicitly via children */}
        {/* The new share buttons in cotizaciones/nuevo/page.tsx will be outside this default footer if placed in children */}
        
        <DialogFooter className="print:hidden sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" /> Cerrar
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> {printButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to conditionally add cn, not strictly needed if always passing string
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

