// src/components/shared/ShareServiceDialog.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Download, Loader2, Eye, Wrench, ShieldCheck, Camera, Copy, Share2, Link as LinkIcon, Car } from 'lucide-react';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '../ui/separator';

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
  
  useEffect(() => {
    if (open) {
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
  }, [open, initialService]);

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

            <div className="py-4 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground"/>
                    <div>
                      <p className="font-semibold">{vehicle?.make} {vehicle?.model}</p>
                      <p className="text-sm text-muted-foreground">{vehicle?.licensePlate}</p>
                    </div>
                  </div>
                  <Separator />
                   <div>
                      <p className="text-sm font-semibold mb-1">Trabajos:</p>
                      <ul className="text-sm text-muted-foreground list-disc pl-5">
                        {(service?.serviceItems || []).map(item => <li key={item.id}>{item.name}</li>)}
                      </ul>
                   </div>
                  <Separator />
                   <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(service?.totalCost)}</span>
                   </div>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
               <Button onClick={handleCopyServiceForWhatsapp} className="w-full sm:w-auto">
                <MessageSquare className="mr-2 h-4 w-4"/> WhatsApp
              </Button>
               <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
                 <Printer className="mr-2 h-4 w-4"/> Imprimir
              </Button>
            </DialogFooter>
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
    </>
  );
}
