
// src/components/shared/ShareServiceDialog.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Download, Loader2, Eye, Wrench, ShieldCheck, Camera, Copy, Share2, Link as LinkIcon } from 'lucide-react';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from "next/image";
import { inventoryService } from '@/lib/services';
import { cn, formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { Input } from '@/components/ui/input';

interface ShareServiceDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
}

export function ShareServiceDialog({ 
  open, 
  onOpenChange, 
  service: initialService, 
}: ShareServiceDialogProps) {
  const { toast } = useToast();
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(null);
  const [service, setService] = useState<ServiceRecord | undefined | null>(initialService);
  const [isLoading, setIsLoading] = useState(true);

  const showOrder = service && service.status !== 'Cotizacion' && service.status !== 'Agendado';
  const showQuote = service && (service.status === 'Cotizacion' || service.status === 'Agendado');
  const showChecklist = service && !!service.safetyInspection && Object.keys(service.safetyInspection).some(k => k !== 'inspectionNotes' && k !== 'technicianSignature' && (service.safetyInspection as any)[k]?.status !== 'na' && (service.safetyInspection as any)[k]?.status !== undefined);
  const showPhotoReport = service && !!service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0);
  
  const tabs = [];
  if (showQuote) tabs.push({ value: 'quote', label: 'Cotización' });
  if (showOrder) tabs.push({ value: 'order', label: 'Orden' });
  if (showChecklist) tabs.push({ value: 'checklist', label: 'Revisión' });
  if (showPhotoReport) tabs.push({ value: 'photoreport', label: 'Reporte Fotográfico' });
    
  const defaultTabValue = service && (service.status === 'Cotizacion' || service.status === 'Agendado') ? 'quote' : 'order';
  const [activeTab, setActiveTab] = useState(defaultTabValue);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (open) {
        setActiveTab(defaultTabValue);
        const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
        if (storedWorkshopInfo) {
          setWorkshopInfo(JSON.parse(storedWorkshopInfo));
        }
        
        const fetchData = async () => {
            setIsLoading(true);
            if (initialService?.vehicleId) {
              const fetchedVehicle = await inventoryService.getVehicleById(initialService.vehicleId);
              setVehicle(fetchedVehicle || null);
            }
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
    }
  }, [open, initialService, defaultTabValue]);

   const renderContentForCapture = async () => {
    setIsRendering(true);
    // Give React a moment to render the off-screen div
    await new Promise(resolve => setTimeout(resolve, 50));
    const imageFile = await handleCopyAsImage(true);
    setIsRendering(false);
    return imageFile;
  };

  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    const elementToCapture = document.getElementById('offscreen-printable-area');
    if (!elementToCapture || !service) return null;
    try {
      const canvas = await html2canvas(elementToCapture, { scale: 2.5, backgroundColor: null, useCORS: true });
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
    if (!service || !vehicle) return;
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
    const imageFile = await renderContentForCapture();
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
        handleCopyServiceForWhatsapp();
    }
  };

  const handlePrint = async () => {
    setIsRendering(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    const printableArea = document.getElementById('offscreen-printable-area');
    if (printableArea) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Imprimir</title>');
            const stylesheets = Array.from(document.styleSheets);
            stylesheets.forEach(sheet => {
                try {
                    if (sheet.href) {
                        printWindow.document.write(`<link rel="stylesheet" href="${sheet.href}">`);
                    } else if (sheet.cssRules) {
                        printWindow.document.write(`<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('')}</style>`);
                    }
                } catch (e) {
                    console.warn("Could not read stylesheet for printing:", e);
                }
            });
            printWindow.document.write('<style>@page { size: letter; margin: 0; } body { margin: 0; } .printable-content { box-shadow: none !important; border: none !important; } </style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printableArea.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
                setIsRendering(false);
            };
        } else {
            setIsRendering(false);
        }
    } else {
        setIsRendering(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Compartir Documento de Servicio</DialogTitle>
                <DialogDescription>
                  Folio: {service?.id || 'N/A'}. Selecciona una opción para compartir o imprimir.
                </DialogDescription>
            </DialogHeader>

            {tabs.length > 1 && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
                  <TabsList className={cn('grid w-full h-auto p-1 bg-muted', tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
                      {tabs.map(tab => (
                          <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                              {tab.label}
                          </TabsTrigger>
                      ))}
                  </TabsList>
              </Tabs>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button onClick={() => renderContentForCapture().then(handleShare)} disabled={isRendering}>
                {isRendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Share2 className="mr-2 h-4 w-4"/>}
                Compartir
              </Button>
              <Button onClick={handleCopyServiceForWhatsapp}>
                <MessageSquare className="mr-2 h-4 w-4"/> WhatsApp
              </Button>
              <Button onClick={() => renderContentForCapture().then(() => handleCopyAsImage(false))} disabled={isRendering}>
                <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
              </Button>
              <Button onClick={handlePrint} disabled={isRendering}>
                 {isRendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4"/>}
                 Imprimir
              </Button>
            </div>
            
            {service?.publicId && (
              <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Enlace Público:</p>
                   <div className="flex items-center gap-2">
                       <Input value={`${window.location.origin}/s/${service.publicId}`} readOnly className="bg-muted"/>
                       <Button size="icon" variant="outline" onClick={() => {
                           navigator.clipboard.writeText(`${window.location.origin}/s/${service.publicId}`);
                           toast({title: "Enlace copiado"});
                       }}>
                          <LinkIcon className="h-4 w-4"/>
                       </Button>
                   </div>
              </div>
            )}

        </DialogContent>
      </Dialog>
      
       {/* Off-screen container for rendering the printable content */}
      <div id="offscreen-printable-area" className="printable-content" style={{ position: 'absolute', left: '-9999px', top: '0', width: '8.5in', height: 'auto', backgroundColor: 'white' }}>
          {isRendering && service && (
              <div className="p-8">
                <ServiceSheetContent
                    ref={contentRef}
                    service={service}
                    vehicle={vehicle || undefined}
                    workshopInfo={workshopInfo as WorkshopInfo}
                    onViewImage={() => {}}
                    activeTab={activeTab}
                />
              </div>
          )}
      </div>

    </>
  );
}
