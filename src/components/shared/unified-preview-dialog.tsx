
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Copy, Eye, Download } from 'lucide-react';
import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo } from '@/types';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { placeholderServiceRecords, placeholderVehicles } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { TicketContent } from '@/components/ticket-content';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import Image from 'next/image';

interface UnifiedPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
}

export function UnifiedPreviewDialog({ open, onOpenChange, service }: UnifiedPreviewDialogProps) {
  const { toast } = useToast();
  const [associatedQuote, setAssociatedQuote] = useState<QuoteRecord | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const serviceSheetRef = useRef<HTMLDivElement>(null);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && service) {
      // Find the associated quote if it exists by looking for a record with the same ID and a quoteDate.
      const foundQuote = placeholderServiceRecords.find(s => s.id === service.id && s.quoteDate);
      setAssociatedQuote(foundQuote || null);

      // Find the associated vehicle
      const foundVehicle = placeholderVehicles.find(v => v.id === service.vehicleId);
      setVehicle(foundVehicle || null);
      
      const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
      if (storedWorkshopInfo) {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      }
    }
  }, [open, service]);

  const handleShareService = useCallback(() => {
    if (!service || !service.publicId) {
      toast({ title: "Enlace no disponible", description: 'No se ha podido generar el enlace público.', variant: "default" });
      return;
    }
    const vehicleForShare = placeholderVehicles.find(v => v.id === service.vehicleId);
    if (!vehicleForShare) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }
    const shareUrl = `${window.location.origin}/s/${service.publicId}`;
    const message = `Hola, ${vehicleForShare.ownerName || 'Cliente'}:

Consulta los detalles de tu servicio para el vehículo ${vehicleForShare.make} ${vehicleForShare.model} en el siguiente enlace:

${shareUrl}

¡Gracias por confiar en nosotros!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado a tu portapapeles.' });
    });
  }, [service, toast]);
  
  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleDownloadImage = () => {
    if (!viewingImageUrl) return;
    window.open(viewingImageUrl, '_blank')?.focus();
  };


  return (
    <>
      <PrintTicketDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Vista Previa Unificada"
        onDialogClose={() => {}}
        dialogContentClassName="printable-quote-dialog max-w-4xl"
        footerActions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => handleShareService()} variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp</Button>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Documento</Button>
          </div>
        }
      >
        {service && (
          <ServiceSheetContent
            ref={serviceSheetRef}
            service={service}
            quote={associatedQuote}
            vehicle={vehicle || undefined}
            workshopInfo={workshopInfo as WorkshopInfo}
            onViewImage={handleViewImage}
          />
        )}
      </PrintTicketDialog>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="print:hidden">
            <DialogTitle>Vista Previa de Imagen</DialogTitle>
            <DialogDescription>
              Visualizando la imagen de evidencia. Puede descargarla si lo necesita.
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {viewingImageUrl && (
              <Image src={viewingImageUrl} alt="Vista ampliada de evidencia" layout="fill" objectFit="contain" crossOrigin="anonymous" />
            )}
          </div>
          <DialogFooter className="mt-2 print:hidden">
            <Button onClick={handleDownloadImage}>
              <Download className="mr-2 h-4 w-4"/>Descargar Imagen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
