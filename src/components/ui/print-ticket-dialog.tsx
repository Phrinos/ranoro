
"use client";

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { cn } from "@/lib/utils";
import html2pdf from 'html2pdf.js';
import { useToast } from '@/hooks/use-toast';

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: React.ReactNode; 
  onDialogClose?: () => void; 
  dialogContentClassName?: string;
  footerActions?: React.ReactNode;
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  children,
  onDialogClose,
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
            margin: 5,
            filename: pdfFileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: [80, 297], orientation: 'portrait' }
        };
    }
    
    // Default to letter format for quotes etc.
    return {
        margin: 5,
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
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
          duration: 2000,
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
          </div>
          <Button type="button" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
