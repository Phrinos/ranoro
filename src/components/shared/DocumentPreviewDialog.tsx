

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
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onPrint?: () => void;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  description = "Vista previa del documento.",
  children,
  onPrint,
}: DocumentPreviewDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 no-print">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto px-6 bg-muted/30 print:bg-white print:p-0">
            <div id="printable-area-document" className="bg-white mx-auto my-4 shadow-lg">
                 {children}
            </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background sm:justify-end no-print">
            <Button onClick={onPrint || (() => window.print())}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
