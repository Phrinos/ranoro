// src/components/shared/ShareServiceDialog.tsx

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, Link as LinkIcon, Car } from 'lucide-react';
import type { ServiceRecord, WorkshopInfo } from '@/types';
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
  const [workshopInfo, setWorkshopInfo] = React.useState<Partial<WorkshopInfo>>({});

  React.useEffect(() => {
    if (open) {
      const storedWorkshopInfo = localStorage.getItem("workshopTicketInfo");
      if (storedWorkshopInfo) {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      }
    }
  }, [open]);

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
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Compartir Documento de Servicio</DialogTitle>
                <DialogDescription>
                  Folio: {initialService?.id || 'N/A'}. Selecciona una opción para compartir o imprimir.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                  <Car className="h-6 w-6 text-muted-foreground flex-shrink-0"/>
                  <div>
                    <p className="font-bold">{initialService?.vehicleIdentifier}</p>
                    <p className="text-sm text-muted-foreground">{initialService?.customerName}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold mb-2">Trabajos a Realizar:</p>
                    <div className="text-sm text-muted-foreground space-y-3 max-h-48 overflow-y-auto pr-3">
                      {(initialService?.serviceItems || []).map(item => (
                          <div key={item.id} className="border-b last:border-b-0 pb-2">
                              <div className="flex justify-between items-start">
                                  <div className="flex-1 pr-2">
                                    <p className="font-medium text-foreground">{item.name}</p>
                                    {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                                        <p className="text-xs text-muted-foreground pl-2">
                                            Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}
                                        </p>
                                    )}
                                  </div>
                                  <span className="font-semibold text-foreground">{formatCurrency(item.price)}</span>
                              </div>
                          </div>
                      ))}
                    </div>
                  </div>
                  <Separator className="my-4"/>
                   <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(initialService?.totalCost)}</span>
                   </div>
                </CardContent>
              </Card>
            </div>
            
            {initialService?.publicId && (
              <div className="space-y-2">
                  <p className="text-sm font-medium">Enlace Público:</p>
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
            
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
               <Button onClick={handleCopyServiceForWhatsapp} className="w-full sm:w-auto">
                <MessageSquare className="mr-2 h-4 w-4"/> WhatsApp
              </Button>
               <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
                 <Printer className="mr-2 h-4 w-4"/> Imprimir
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
