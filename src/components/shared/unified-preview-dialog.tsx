

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Download, Loader2, Eye, Wrench, ShieldCheck, Camera, Copy, Share2 } from 'lucide-react';
import type { ServiceRecord, Vehicle, WorkshopInfo, InventoryItem } from '@/types';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from "next/image";
import { inventoryService } from '@/lib/services';
import { cn, formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';


interface UnifiedPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service?: ServiceRecord;
  vehicle?: Vehicle | null;
  documentType?: 'service' | 'text';
  textContent?: string;
  title?: string;
}

export function UnifiedPreviewDialog({ 
  open, 
  onOpenChange, 
  service: initialService, 
  vehicle: initialVehicle,
  documentType = 'service',
  textContent,
  title
}: UnifiedPreviewDialogProps) {
  const { toast } = useToast();
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(initialVehicle);
  const [service, setService] = useState<ServiceRecord | undefined | null>(initialService);
  const [isLoading, setIsLoading] = useState(true);

  const showOrder = service && service.status !== 'Cotizacion' && service.status !== 'Agendado';
  const showQuote = service && (service.status === 'Cotizacion' || service.status === 'Agendado');
  const showChecklist = service && !!service.safetyInspection && Object.keys(service.safetyInspection).some(k => k !== 'inspectionNotes' && k !== 'technicianSignature' && (service.safetyInspection as any)[k]?.status !== 'na' && (service.safetyInspection as any)[k]?.status !== undefined);
  const showPhotoReport = service && !!service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0);
  
  const tabs = [];
  if (showQuote) tabs.push({ value: 'quote', label: 'Cotización', icon: Eye });
  if (showOrder) tabs.push({ value: 'order', label: 'Orden', icon: Wrench });
  if (showChecklist) tabs.push({ value: 'checklist', label: 'Revisión', icon: ShieldCheck });
  if (showPhotoReport) tabs.push({ value: 'photoreport', label: 'Fotos', icon: Camera });
    
  const defaultTabValue = service && (service.status === 'Cotizacion' || service.status === 'Agendado') ? 'quote' : 'order';
  const [activeTab, setActiveTab] = useState(defaultTabValue);

  const gridColsClass = 
    tabs.length === 4 ? 'grid-cols-4' :
    tabs.length === 3 ? 'grid-cols-3' :
    tabs.length === 2 ? 'grid-cols-2' :
    'grid-cols-1';


  useEffect(() => {
    if (open) {
      if (documentType === 'service') {
        setActiveTab(defaultTabValue);
        const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
        if (storedWorkshopInfo) {
          setWorkshopInfo(JSON.parse(storedWorkshopInfo));
        }
        
        const fetchData = async () => {
            setIsLoading(true);

            if (!initialVehicle && initialService?.vehicleId) {
              const fetchedVehicle = await inventoryService.getVehicleById(initialService.vehicleId);
              setVehicle(fetchedVehicle || null);
            } else if (initialVehicle !== undefined) {
              setVehicle(initialVehicle);
            }
            
            // Fetch latest inventory to get updated supply names
            if (initialService) {
                const inventoryItems = await inventoryService.onItemsUpdatePromise();
                const inventoryMap = new Map(inventoryItems.map(i => [i.id, i.name]));
                const updatedService = {
                    ...initialService,
                    serviceItems: (initialService.serviceItems || []).map(item => ({
                        ...item,
                        suppliesUsed: (item.suppliesUsed || []).map(supply => ({
                            ...supply,
                            supplyName: inventoryMap.get(supply.supplyId) || supply.supplyName,
                        }))
                    }))
                };
                setService(updatedService);
            }

            setIsLoading(false);
        };
        
        fetchData();
      } else {
        setIsLoading(false);
      }
    }
  }, [open, initialService, initialVehicle, defaultTabValue, documentType]);

  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!contentRef.current || !service) return null;
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2.5, backgroundColor: null, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `servicio_${service.id}.png`, { type: 'image/png' });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: "Copiado", description: "La imagen del documento ha sido copiada." });
        return null;
      }
    } catch (e) {
      console.error('Error handling image:', e);
      toast({ title: "Error", description: "No se pudo procesar la imagen del documento.", variant: "destructive" });
      return null;
    }
  }, [service, toast]);

  const handleCopyServiceForWhatsapp = useCallback(() => {
    if (!service) return;
    if (!vehicle) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }
    const workshopName = (workshopInfo as WorkshopInfo)?.name || 'nuestro taller';
    let message = `Hola ${vehicle.ownerName || 'Cliente'}, aquí tienes los detalles de tu servicio en ${workshopName}.`;
    
    if (service.publicId) {
        const shareUrl = `${window.location.origin}/s/${service.publicId}`;
        message += `\n\nPuedes ver los detalles y firmar de conformidad en el siguiente enlace:\n${shareUrl}`;
    } else {
        message += `\n\nFolio de Servicio: ${service.id}\nTotal: ${formatCurrency(service.totalCost)}`;
    }
    
    message += `\n\n¡Agradecemos tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado a tu portapapeles.' });
    });
  }, [service, vehicle, toast, workshopInfo]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: `Servicio #${service?.id}`,
          text: `Detalles del servicio para ${vehicle?.licensePlate} en ${(workshopInfo as WorkshopInfo)?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        if (!String(error).includes('AbortError')) {
           toast({ title: 'No se pudo compartir', description: 'Copiando texto para WhatsApp como alternativa.', variant: 'default' });
           handleCopyServiceForWhatsapp();
        }
      }
    } else {
        // Fallback if sharing is not supported or image creation failed
        handleCopyServiceForWhatsapp();
    }
  };


  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleDownloadImage = () => {
    if (!viewingImageUrl) return;
    window.open(viewingImageUrl, '_blank')?.focus();
  };
  
  const handlePrint = () => {
    const printableArea = contentRef.current;
    if (printableArea) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const stylesheets = Array.from(document.getElementsByTagName('link'));
        let styles = '';
        stylesheets.forEach(sheet => {
          if (sheet.rel === 'stylesheet' && sheet.href) {
            styles += `<link rel="stylesheet" href="${sheet.href}">`;
          }
        });
        const customStyles = `
          <style>
            @page { margin: 0; size: letter; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; }
            #printable-area-dialog { background-color: white !important; box-shadow: none !important; margin: 0 !important; padding: 1cm !important; width: 100% !important; height: auto !important; }
          </style>
        `;
        printWindow.document.write(`<html><head><title>Imprimir</title>${styles}${customStyles}</head><body>`);
        printWindow.document.write(printableArea.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
      }
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle>{title || 'Vista Previa Unificada'}</DialogTitle>
            <DialogDescription>
              {documentType === 'service' ? 'Contenido del documento listo para imprimir o compartir.' : 'Contenido del documento.'}
            </DialogDescription>
            {documentType === 'service' && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
                  <TabsList className={`grid w-full ${gridColsClass}`}>
                      {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{tab.label}</TabsTrigger>)}
                  </TabsList>
              </Tabs>
            )}
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto px-6 bg-muted/30 relative pb-[80px]">
             <div id="printable-area-dialog" className="w-[8.5in] h-auto bg-white mx-auto my-4 shadow-lg p-8">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando...</div>
                ) : documentType === 'service' && service ? (
                    <ServiceSheetContent
                    ref={contentRef}
                    service={service}
                    vehicle={vehicle || undefined}
                    workshopInfo={workshopInfo as WorkshopInfo}
                    onViewImage={handleViewImage}
                    activeTab={activeTab}
                    />
                ) : (
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: textContent || '' }} />
                )}
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t flex-shrink-0 bg-background sm:justify-end absolute bottom-0 left-0 right-0">
            <div className="flex flex-col sm:flex-row gap-2">
              {documentType === 'service' && (
                <>
                    <Button onClick={() => handleCopyAsImage()} variant="outline"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
                    <Button onClick={handleCopyServiceForWhatsapp} variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp</Button>
                    <Button onClick={handleShare} variant="outline"><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
                </>
              )}
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimir Documento</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
            {viewingImageUrl && (
              <div className="relative aspect-video w-full">
                <Image src={viewingImageUrl} alt="Vista ampliada de evidencia" fill style={{objectFit:"contain"}} sizes="(max-width: 768px) 100vw, 1024px" crossOrigin="anonymous" />
              </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
