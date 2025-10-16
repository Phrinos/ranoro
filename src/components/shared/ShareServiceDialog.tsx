// src/components/shared/ShareServiceDialog.tsx
"use client";

import React, { useRef, useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ServiceRecord, Vehicle } from '@/types';
import { Copy, Share2, MessageSquare, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ServiceSheetContent } from '../ServiceSheetContent';
import { Separator } from '../ui/separator';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketContent } from '../ticket-content';

interface ShareServiceDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord | null;
  vehicle?: Vehicle | null;
}

export function ShareServiceDialog({ open, onOpenChange, service, vehicle }: ShareServiceDialogProps) {
  const { toast } = useToast();
  const serviceSheetRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [previewType, setPreviewType] = useState<'sheet' | 'ticket'>('sheet');
  
  const handleCopyToClipboard = useCallback(async (text: string, type: 'link' | 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado",
        description: `${type === 'link' ? 'El enlace' : 'El mensaje'} ha sido copiado al portapapeles.`,
      });
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast({
        title: "Error",
        description: "No se pudo copiar el contenido.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCopyImageToClipboard = useCallback(async () => {
    if (!ticketRef.current) {
        toast({ title: "Error", description: "No se puede generar la imagen del ticket.", variant: "destructive" });
        return;
    }
    try {
        const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: 'white', useCORS: true });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("No se pudo crear la imagen.");
        
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: "Ticket Copiado", description: "La imagen del ticket se ha copiado al portapapeles." });
    } catch (err) {
        console.error("Error copying image:", err);
        toast({ title: "Error", description: "No se pudo copiar la imagen del ticket.", variant: "destructive" });
    }
  }, [ticketRef, toast]);

  if (!service) {
    return null;
  }

  const getCleanPublicUrl = () => {
    const hostname = window.location.hostname;
    const publicHostname = hostname.replace(/^\d+-/, '6000-');
    const protocol = window.location.protocol;
    return `${protocol}//${publicHostname}/s/${service.publicId || service.id}`;
  };

  const publicUrl = getCleanPublicUrl();
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Servicio para ${vehicle?.make} ${vehicle?.model}`,
          text: `Hola ${service.customerName || 'Cliente'}, aquí está el enlace para ver los detalles de tu servicio:`,
          url: publicUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
        toast({ title: "No disponible", description: "La función de compartir no es compatible con este navegador." });
    }
  };
  
  const getWhatsappMessage = () => {
    const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : `Vehículo con placas ${service.vehicleIdentifier}`;
    const message = `Hola ${service.customerName || ''}, te comparto el enlace para que puedas ver el estado y los detalles de tu servicio para ${vehicleName}.\n\nPuedes verlo aquí: ${publicUrl}\n\n¡Gracias por tu preferencia!`;
    return encodeURIComponent(message);
  };
  
  const isServiceDelivered = service.status === 'Entregado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 flex flex-col">
                <DialogHeader>
                    <DialogTitle>Compartir Documento de Servicio</DialogTitle>
                    <DialogDescription>
                        Envía al cliente un enlace para ver el estado y detalles del servicio en tiempo real.
                    </DialogDescription>
                </DialogHeader>
                <div className="my-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Enlace Público</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={publicUrl}
                                className="w-full px-3 py-2 text-sm border rounded-md bg-white text-muted-foreground"
                            />
                            <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(publicUrl, 'link')} className="bg-white">
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" asChild className="bg-white">
                                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
                <Separator className="my-4" />
                <DialogFooter className="mt-auto flex-col sm:flex-col sm:space-x-0 gap-2">
                    <Button variant="outline" onClick={handleCopyImageToClipboard} className="w-full h-12 bg-white border-purple-500 text-black hover:bg-purple-50" disabled={!isServiceDelivered}>
                        <ImageIcon className="mr-2 h-4 w-4 text-purple-600" /> Copiar Ticket como Imagen
                    </Button>
                    <Button variant="outline" onClick={() => handleCopyToClipboard(decodeURIComponent(getWhatsappMessage()), 'text')} className="w-full h-12 bg-white border-blue-500 text-black hover:bg-blue-50">
                        <Copy className="mr-2 h-4 w-4 text-blue-600" /> Copiar Mensaje
                    </Button>
                    {vehicle?.chatMetaLink && (
                         <Button variant="outline" asChild className="w-full h-12 bg-white border-green-500 text-black hover:bg-green-50">
                            <a href={vehicle.chatMetaLink} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2 h-4 w-4 text-green-600" /> Abrir Chat
                            </a>
                        </Button>
                    )}
                    <Button onClick={handleShare} variant="outline" className="w-full h-12 bg-white border-red-500 text-black hover:bg-red-50">
                        <Share2 className="mr-2 h-4 w-4 text-red-600" /> Compartir
                    </Button>
                </DialogFooter>
            </div>
            <div className="hidden md:block bg-white p-6 overflow-y-auto max-h-[80vh]">
                <Tabs value={previewType} onValueChange={(value) => setPreviewType(value as 'sheet' | 'ticket')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="sheet">Hoja de Servicio</TabsTrigger>
                        <TabsTrigger value="ticket">Ticket</TabsTrigger>
                    </TabsList>
                    <div className="mt-4 bg-muted/30 p-4 rounded-md">
                        <TabsContent value="sheet">
                            <div ref={serviceSheetRef}>
                                <ServiceSheetContent service={service} vehicle={vehicle} onCancelAppointment={() => {}} />
                            </div>
                        </TabsContent>
                        <TabsContent value="ticket">
                             <div className="flex justify-center">
                                <TicketContent ref={ticketRef} service={service} vehicle={vehicle || undefined} />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
