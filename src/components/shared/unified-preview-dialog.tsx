

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Download } from 'lucide-react';
import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo } from '@/types';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import Image from "next/image";
import { inventoryService } from '@/lib/services'; 

interface UnifiedPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
  vehicle?: Vehicle | null; // Making vehicle optional
  associatedQuote?: QuoteRecord | null;
}

export function UnifiedPreviewDialog({ open, onOpenChange, service, vehicle: initialVehicle, associatedQuote }: UnifiedPreviewDialogProps) {
  const { toast } = useToast();
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(initialVehicle);

  useEffect(() => {
    if (open) {
      const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
      if (storedWorkshopInfo) {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      }
      
      const fetchVehicleIfNeeded = async () => {
          // If vehicle is not passed as a prop, or if the service's vehicleId doesn't match, fetch it.
          if ((!initialVehicle || initialVehicle.id !== service.vehicleId) && service.vehicleId) {
              const v = await inventoryService.getVehicleById(service.vehicleId);
              setVehicle(v || null);
          } else {
              setVehicle(initialVehicle); // Use the one passed in props
          }
      };
      fetchVehicleIfNeeded();
    }
  }, [open, service, initialVehicle]);

  const handleShareService = useCallback(() => {
    if (!service || !service.publicId) {
      toast({ title: "Enlace no disponible", description: 'No se ha podido generar el enlace público.', variant: "default" });
      return;
    }
    if (!vehicle) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }
    const shareUrl = `${window.location.origin}/s/${service.publicId}`;
    
    const message = `${shareUrl}

Hola ${vehicle.ownerName || 'Cliente'}, gracias por confiar en Ranoro. Te proporcionamos los detalles del servicio de tu vehículo ${vehicle.make} ${vehicle.model} ${vehicle.year} placas ${vehicle.licensePlate}.

• Haz clic en el enlace y encontrarás:
  1️⃣ La cotización detallada.
  2️⃣ La hoja de servicio para que firmes la entrega y recepción, además de las actualizaciones de estatus.
  3️⃣ Las evidencias fotográficas cuando estén listas.

¡Cualquier duda, escríbenos!`;


    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado a tu portapapeles.' });
    });
  }, [service, vehicle, toast]);
  
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
            <Button onClick={handleShareService} variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp</Button>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Documento</Button>
          </div>
        }
      >
        {service && vehicle !== undefined && (
          <ServiceSheetContent
            ref={contentRef}
            service={service}
            associatedQuote={associatedQuote}
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
              <Image src={viewingImageUrl} alt="Vista ampliada de evidencia" fill className="object-contain" crossOrigin="anonymous" />
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
