
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
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  children,
  onDialogClose,
  autoPrint = false,
  printButtonText = "Imprimir",
  dialogContentClassName = ""
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
        // Default small dialog size for tickets
        "sm:max-w-md", 
        // Make the dialog for quotes wider for a better preview
        dialogContentClassName?.includes('quote') && "sm:max-w-4xl",
        // Base print styles
        "print:max-w-full print:border-none print:shadow-none print:p-0",
        dialogContentClassName
      )}>
        <DialogHeader className="print:hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {/* Adds a scrollable viewport for the content */}
        <div className="my-4 max-h-[70vh] overflow-y-auto bg-muted/50 p-2 sm:p-4 rounded-md print:hidden">
          <div className="ticket-container">
            {children} 
          </div>
        </div>

        {/* For printing, the content is rendered directly without the scroll container */}
        <div className="hidden print:block">
           {children}
        </div>

        <DialogFooter className="print:hidden sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" /> Cerrar
          </Button>
          <div className="flex-grow" />
          {/* This div will contain other action buttons like Send Email/WhatsApp */}
          <div className="flex gap-2 print-hidden">
             {React.Children.toArray(children).map((child: any) => 
                child.props.quote ? (child.props.children || []) : []
             ).flat().filter((grandChild: any) => 
                grandChild.props.className?.includes('print-hidden')
             )}
          </div>
          <Button type="button" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> {printButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
