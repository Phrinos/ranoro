

"use client";

import React, { useRef } from 'react';
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
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  description = "Vista previa del documento.",
  children,
}: DocumentPreviewDialogProps) {
  
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const node = contentRef.current;
    if (node) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Imprimir</title>');
            // Link stylesheets
            const stylesheets = Array.from(document.getElementsByTagName('link'));
            stylesheets.forEach(sheet => {
                if (sheet.rel === 'stylesheet' && sheet.href) {
                    printWindow.document.write(`<link rel="stylesheet" href="${sheet.href}">`);
                }
            });
            // Apply specific print styles
            printWindow.document.write(`
                <style>
                    @page { size: letter; margin: 0.5in; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(node.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
            // Wait for content to load before printing
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500); 
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 no-print">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto px-6 bg-muted/30 print:bg-white print:p-0">
            <div id="printable-area-document" ref={contentRef} className="bg-white mx-auto my-4 shadow-lg">
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
