
"use client";

import React from 'react';
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
  onDialogClose?: () => void; // Optional: callback when dialog is closed
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  children,
  onDialogClose
}: PrintTicketDialogProps) {

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
