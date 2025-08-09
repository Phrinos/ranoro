// src/components/shared/ShareServiceDialog.tsx

"use client";

import React, from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Link as LinkIcon, Car } from 'lucide-react';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '../ui/separator';
import { formatCurrency } from '@/lib/utils';


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
  const [workshopInfo, setWorkshopInfo] = React.useState<WorkshopInfo | {}>({});
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);

  React.useEffect(() => {
    if (open) {
      const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
      if (storedWorkshopInfo) {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      }
      // This assumes vehicle data might be passed differently or fetched.
      // For now, let's keep it simple. This component might need vehicle prop passed.
    }
  }, [open, initialService]);

  const handleCopyServiceForWhatsapp = React.useCallback(() => {
    if (!initialService) return;
    const workshopName = (workshopInfo as WorkshopInfo)?.name || 'nuestro taller';
    let message = `Hola ${initialService.customerName || 'Cliente'}, aquí tienes los detalles de tu servicio en ${workshopName}.`;
    if (initialService.publicId) {
        const shareUrl = `${window.location.origin}/s/${initialService.publicId}`;
        message += `\n\nPuedes ver los detalles y firmar de conformidad en el siguiente enlace:\n${shareUrl}`;
    } else {
        message += `\n\nFolio de Servicio: ${initialService.id}\nTotal: ${formatCurrency(initialService.totalCost)}`;
    }
    message += `\n\n¡Agradecemos tu preferencia!`;
    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado a tu portapapeles.' });
    });
  }, [initialService, toast, workshopInfo]);
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Compartir Documento de Servicio</DialogTitle>
                <DialogDescription>
                  Folio: {initialService?.id || 'N/A'}. Selecciona una opción para compartir o imprimir.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground"/>
                    <div>
                      <p className="font-semibold">{initialService?.vehicleIdentifier}</p>
                    </div>
                  </div>
                  <Separator />
                   <div>
                      <p className="text-sm font-semibold mb-2">Trabajos a Realizar:</p>
                      <div className="text-sm text-muted-foreground space-y-2">
                        {(initialService?.serviceItems || []).map(item => (
                            <div key={item.id} className="border-b last:border-b-0 pb-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-foreground">{item.name}</span>
                                    <span className="font-medium text-foreground">{formatCurrency(item.price)}</span>
                                </div>
                                {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                    <p className="text-xs text-muted-foreground pl-2">
                                        Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}
                                    </p>
                                )}
                            </div>
                        ))}
                      </div>
                   </div>
                  <Separator />
                   <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(initialService?.totalCost)}</span>
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
             {initialService?.publicId && (
              <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Enlace Público:</p>
                   <div className="flex items-center gap-2">
                       <Input value={`${window.location.origin}/s/${initialService.publicId}`} readOnly className="bg-muted"/>
                       <Button size="icon" variant="outline" onClick={() => {
                           navigator.clipboard.writeText(`${window.location.origin}/s/${initialService.publicId}`);
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
