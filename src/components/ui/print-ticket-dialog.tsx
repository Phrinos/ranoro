

"use client";

import React, { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from './button';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

interface PrintTicketDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode; 
  onDialogClose?: () => void; 
  dialogContentClassName?: string;
  footerActions?: React.ReactNode;
  whatsappMessage?: string;
  customerPhone?: string;
  contentRef: React.RefObject<HTMLDivElement>;
}

export function PrintTicketDialog({
  open,
  onOpenChange,
  title,
  description = "Contenido del documento listo para imprimir o compartir.",
  children,
  onDialogClose,
  dialogContentClassName = "",
  footerActions,
  whatsappMessage,
  customerPhone,
  contentRef,
}: PrintTicketDialogProps) {
    const { toast } = useToast();

    const handleShareOnWhatsApp = useCallback(async () => {
    if (!contentRef.current) return;

    const message = whatsappMessage || "Aquí está su recibo.";
    const phone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    
    // Check if we can use the Web Share API (primarily on mobile)
    const canShareFiles = !!navigator.share && !!navigator.canShare && navigator.canShare({ files: [new File([], '')] });

    try {
        const canvas = await html2canvas(contentRef.current, { scale: 2.5, backgroundColor: null });
        
        if (canShareFiles) {
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const file = new File([blob], "ticket.png", { type: "image/png" });
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Ticket de Servicio',
                            text: message,
                        });
                    } catch (err) {
                        if ((err as Error).name !== 'AbortError') {
                          console.error("Share failed:", err);
                          toast({ title: 'Error al compartir', variant: 'destructive' });
                        }
                    }
                }
            }, 'image/png');
        } else {
            // Desktop fallback: Open WhatsApp Web
            const url = `https://web.whatsapp.com/send?${phone ? `phone=${phone}&` : ''}text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            toast({ title: 'Abriendo WhatsApp Web', description: 'Por favor, copie y pegue la imagen del ticket en el chat.', duration: 5000 });
        }
    } catch (e) {
        console.error("Error generating or sharing image:", e);
        toast({ title: 'Error', description: 'No se pudo generar o compartir la imagen del ticket.', variant: 'destructive' });
    }
  }, [contentRef, whatsappMessage, customerPhone, toast]);


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
        "sm:max-w-md", // Default width
        "flex flex-col max-h-[90vh]", // Ensure dialog doesn't overflow viewport
        dialogContentClassName 
      )}>
        <DialogHeader className="print:hidden flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div id="printable-area-dialog" className="flex-grow overflow-y-auto bg-muted/30 p-2 sm:p-4 rounded-md">
            <div className="printable-content">
                {children}
            </div>
        </div>

        {(footerActions || whatsappMessage) && (
          <DialogFooter className="print:hidden flex-shrink-0 flex-col-reverse sm:flex-row gap-2 sm:justify-between items-center w-full">
            {whatsappMessage && (
                <Button onClick={handleShareOnWhatsApp} variant="success" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                    <MessageSquare className="mr-2 h-4 w-4" /> Compartir en WhatsApp
                </Button>
            )}
            <div className="flex justify-end gap-2 w-full sm:w-auto">
                {footerActions}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
