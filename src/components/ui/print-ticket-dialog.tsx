
"use client";

import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from 'lucide-react';
import { cn } from "@/lib/utils";
import html2pdf from 'html2pdf.js';
import { useToast } from '@/hooks/use-toast';

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode; 
  onDialogClose?: () => void; 
  autoPrint?: boolean; 
  printButtonText?: string;
  dialogContentClassName?: string;
  footerActions?: React.ReactNode;
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
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getPdfOptions = () => {
    const format = contentRef.current?.querySelector('[data-format]')?.getAttribute('data-format') || 'letter';
    const pdfFileName = `${title.replace(/[:\s/]/g, '_')}.pdf`;

    if (format === 'receipt') {
        return {
            margin: [2, 2, 2, 2], // Margin in mm [top, right, bottom, left]
            filename: pdfFileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: [80, 297], orientation: 'portrait' }
        };
    }
    
    // Default to letter format for quotes etc.
    return {
        margin: 7.5,
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = contentRef.current;
    if (element) {
      const opt = getPdfOptions();

      toast({
        title: "Generando PDF...",
        description: `Se está preparando ${opt.filename}.`,
      });

      html2pdf().from(element).set(opt).save().then(() => {
        toast({
          title: "PDF Descargado",
          description: "El archivo se ha guardado exitosamente.",
        });
      }).catch((err: any) => {
        toast({
          title: "Error al generar PDF",
          description: "Ocurrió un problema al crear el archivo.",
          variant: "destructive",
        });
        console.error("PDF generation error:", err);
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onDialogClose) {
      onDialogClose();
    }
  };
  
  useEffect(() => {
    if (autoPrint && open) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [autoPrint, open]);


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(true);
    }}>
      <DialogContent className={cn(
        "sm:max-w-4xl printable-content",
        "print:max-w-full print:border-none print:shadow-none print:p-0",
        dialogContentClassName
      )}>
        <DialogHeader className="print-hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="my-4 max-h-[70vh] overflow-y-auto bg-muted/50 p-4 rounded-md print:overflow-visible print:max-h-none print:bg-transparent print:p-0 print:m-0">
          {React.cloneElement(children as React.ReactElement, { ref: contentRef })}
        </div>

        <DialogFooter className="print-hidden sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            {footerActions}
            <Button type="button" variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
          <Button type="button" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> {printButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
