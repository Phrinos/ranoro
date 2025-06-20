
"use client";

import React, { useEffect } from 'react'; // Import useEffect
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from 'lucide-react';

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode; // This will be the <TicketContent />
  onDialogClose?: () => void; 
  autoPrint?: boolean; // Nueva propiedad
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  children,
  onDialogClose,
  autoPrint = false // Valor por defecto
}: PrintTicketDialogProps) {

  useEffect(() => {
    if (autoPrint && open) {
      // Un pequeño retraso para asegurar que el contenido del diálogo se renderice completamente
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
      <DialogContent className="sm:max-w-md print:max-w-full print:border-none print:shadow-none print:p-0">
        <DialogHeader className="print:hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="ticket-container my-4">
          {children}
        </div>

        <DialogFooter className="print:hidden sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" /> Cerrar
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
