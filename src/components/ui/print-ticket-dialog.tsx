
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

  useEffect(() => {
    if (autoPrint && open) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [autoPrint, open]);

  const handlePrint = () => {
    const element = contentRef.current;
    if (element) {
      const pdfFileName = `${title.replace(/[:\s/]/g, '_')}.pdf`;
      const opt = {
        margin: 0,
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      toast({
        title: "Generando Vista de Impresión...",
        description: `Se está preparando el archivo ${pdfFileName}.`,
      });
      
      html2pdf().from(element).set(opt).output('bloburl').then((url) => {
        window.open(url, '_blank');
      }).catch(err => {
        toast({
          title: "Error al generar PDF para imprimir",
          description: "Ocurrió un problema al crear el archivo.",
          variant: "destructive",
        });
        console.error("PDF generation error for printing:", err);
      });
    }
  };

  const handleDownloadPDF = () => {
    const element = contentRef.current;
    if (element) {
      const pdfFileName = `${title.replace(/[:\s/]/g, '_')}.pdf`;
      const opt = {
        margin: 0,
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      toast({
        title: "Generando PDF...",
        description: `Se está preparando el archivo ${pdfFileName}.`,
      });

      html2pdf().from(element).set(opt).save().then(() => {
        toast({
          title: "PDF Descargado",
          description: "El archivo se ha guardado exitosamente.",
        });
      }).catch(err => {
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(true);
    }}>
      <DialogContent className={cn(
        "sm:max-w-4xl printable-content", // Make dialog wider and add printable-content class
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
