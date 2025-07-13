

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Download, Loader2, Eye, Wrench, CheckCircle, ShieldCheck, Camera } from 'lucide-react';
import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo } from '@/types';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from "next/image";
import { inventoryService, operationsService } from '@/lib/services';
import { cn } from '@/lib/utils';


interface UnifiedPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
  vehicle?: Vehicle | null; // Make vehicle optional
}

export function UnifiedPreviewDialog({ open, onOpenChange, service, vehicle: initialVehicle }: UnifiedPreviewDialogProps) {
  const { toast } = useToast();
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(initialVehicle || null);
  const [isLoading, setIsLoading] = useState(true);

  const showOrder = service.status !== 'Cotizacion' && service.status !== 'Agendado';
  const showQuote = !!(service.status === 'Cotizacion' || service.status === 'Agendado');
  const showChecklist = !!service.safetyInspection && Object.keys(service.safetyInspection).some(k => k !== 'inspectionNotes' && k !== 'technicianSignature' && (service.safetyInspection as any)[k]?.status !== 'na' && (service.safetyInspection as any)[k]?.status !== undefined);
  const showPhotoReport = !!service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0);
  
  const tabs = [];
  if (showQuote) tabs.push({ value: 'quote', label: 'Cotización', icon: Eye });
  if (showOrder) tabs.push({ value: 'order', label: 'Orden', icon: Wrench });
  if (showChecklist) tabs.push({ value: 'checklist', label: 'Revisión', icon: ShieldCheck });
  if (showPhotoReport) tabs.push({ value: 'photoreport', label: 'Fotos', icon: Camera });
    
  const defaultTabValue = service.status === 'Cotizacion' || service.status === 'Agendado' ? 'quote' : 'order';
  const [activeTab, setActiveTab] = useState(defaultTabValue);

  const gridColsClass = 
    tabs.length === 4 ? 'grid-cols-4' :
    tabs.length === 3 ? 'grid-cols-3' :
    tabs.length === 2 ? 'grid-cols-2' :
    'grid-cols-1';


  useEffect(() => {
    if (open) {
      setActiveTab(defaultTabValue);
      const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
      if (storedWorkshopInfo) {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      }
      
      const fetchData = async () => {
          setIsLoading(true);

          if (!initialVehicle && service.vehicleId) {
            const fetchedVehicle = await inventoryService.getVehicleById(service.vehicleId);
            setVehicle(fetchedVehicle || null);
          } else {
            setVehicle(initialVehicle || null);
          }
          
          setIsLoading(false);
      };
      
      fetchData();
    }
  }, [open, service, initialVehicle, defaultTabValue]);

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
  
   const handlePrint = () => {
    const printableArea = document.getElementById('printable-area-preview');
    if (printableArea) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // You might need to add stylesheets here if they are not inline
        printWindow.document.write('<html><head><title>Imprimir</title>');
        const styles = Array.from(document.styleSheets)
            .map(s => `<link rel="stylesheet" href="${s.href}">`)
            .join('');
        printWindow.document.write(styles);
        printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .printable-content { margin: 0; padding: 0; } }</style></head><body>');
        printWindow.document.write(printableArea.innerHTML);
        printWindow.document.write('</body></html>');

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500); // Delay to allow styles to load
      }
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle>Vista Previa Unificada</DialogTitle>
            <DialogDescription>Contenido del documento listo para imprimir o compartir.</DialogDescription>
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
                <TabsList className={cn('grid w-full', gridColsClass)}>
                    {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{tab.label}</TabsTrigger>)}
                </TabsList>
            </Tabs>
          </DialogHeader>
          
          <div id="printable-area-preview" className="flex-grow overflow-y-auto px-6 bg-muted/30">
            {isLoading ? (
                <div className="flex justify-center items-center h-[50vh]"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando...</div>
            ) : (
              <div className="bg-white shadow-lg my-4">
                <ServiceSheetContent
                  ref={contentRef}
                  service={service}
                  vehicle={vehicle || undefined}
                  workshopInfo={workshopInfo as WorkshopInfo}
                  onViewImage={handleViewImage}
                  activeTab={activeTab}
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background sm:justify-end">
            <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleShareService} variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp</Button>
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimir Documento</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
