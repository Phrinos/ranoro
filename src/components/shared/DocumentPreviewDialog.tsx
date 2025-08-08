
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
import { Button } from '../ui/button';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  description = "Vista previa del documento.",
  children,
}: DocumentPreviewDialogProps) {

  const handlePrint = () => {
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] flex flex-col p-0")}>
        <DialogHeader className="p-6 pb-2 flex-shrink-0 no-print">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto px-6 bg-muted/30 print:bg-white print:p-0">
            <div className="printable-area print-format-letter bg-white mx-auto my-4 shadow-lg print:shadow-none print:m-0 print:p-0">
                 {children}
            </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background sm:justify-end no-print">
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
