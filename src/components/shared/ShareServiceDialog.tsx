// src/components/shared/ShareServiceDialog.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Printer, Car, ExternalLink, Share2, Copy } from "lucide-react";
import type { ServiceRecord, Vehicle, WorkshopInfo, ServiceItem } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from '@iconify/react';
import { useIsMobile } from "@/hooks/use-mobile"; // Import the mobile hook

interface ShareServiceDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
  vehicle?: Vehicle;
}

// --- Helpers ---
const buildShareUrl = (publicId?: string) => {
  try { return publicId ? new URL(`/s/${publicId}`, window.location.origin).toString() : ""; } catch { return ""; }
};

const buildShareMessage = (svc: ServiceRecord, total: number, vehicle?: Vehicle, workshop?: Partial<WorkshopInfo>) => {
  const customerName = svc.customerName || "Cliente";
  const vehicleDescription = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : '';
  const vehiclePlates = vehicle ? `(${vehicle.licensePlate})` : svc.vehicleIdentifier || '';
  const url = buildShareUrl(svc.publicId);

  const itemsList = (svc.serviceItems || [])
    .map(item => `- ${item.name}: ${formatCurrency(item.price || 0)}`)
    .join('\n');

  const message = `Hola ${customerName}👋

Se ha generado un documento de servicio para tu ${vehicleDescription} ${vehiclePlates}.
Folio: #${svc.id}

Resumen de conceptos:
${itemsList}

*Total: ${formatCurrency(total)}*

Desde este enlace puedes consultar en todo momento el detalle de tu servicio:
👉 ${url}

Gracias por confiar en ${workshop?.name || 'nuestro taller'}.
`;
  
  return message;
};

const fallbackCopyToClipboard = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    return document.execCommand('copy');
  } catch (err) {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
};

export function ShareServiceDialog({ open, onOpenChange, service: initialService, vehicle }: ShareServiceDialogProps) {
  const { toast } = useToast();
  const [workshopInfo, setWorkshopInfo] = React.useState<Partial<WorkshopInfo>>({});
  const isMobile = useIsMobile();
  
  const serviceTotal = React.useMemo(() => 
    (initialService?.serviceItems || []).reduce((sum, item) => sum + (item.price || 0), 0),
    [initialService?.serviceItems]
  );

  React.useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem("workshopTicketInfo");
    if (stored) {
      try { setWorkshopInfo(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [open]);

  const shareUrl = React.useMemo(() => buildShareUrl(initialService?.publicId), [initialService?.publicId]);
  const message = React.useMemo(() => buildShareMessage(initialService, serviceTotal, vehicle, workshopInfo), [initialService, serviceTotal, vehicle, workshopInfo]);

  const copy = async (text: string, label = "Copiado al portapapeles") => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!fallbackCopyToClipboard(text)) {
        throw new Error("Copy failed");
      }
      toast({ title: label });
    } catch (err) {
      toast({ title: "No se pudo copiar", description: "Intenta de nuevo o pega manualmente.", variant: "destructive" });
    }
  };
  
  const handleCopyWhatsApp = React.useCallback(() => copy(message, "Mensaje copiado"), [message, copy]);

  const handleNativeShare = React.useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Servicio Ranoro", text: message, url: shareUrl || undefined });
      } else {
        await copy(message, "Mensaje copiado – pega en tu app");
      }
    } catch { /* cancel/share error */ }
  }, [message, shareUrl, copy]);

  if (!initialService) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl p-0 overflow-hidden" hideCloseButton={true}>
        <div className="bg-gradient-to-r from-primary to-rose-700 text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center"><Car className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-white text-lg font-extrabold tracking-tight">Compartir documento de servicio</DialogTitle>
                <DialogDescription className="text-white/80">
                  Folio: <span className="font-semibold">{initialService?.id || "N/A"}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-white/70">Total</div>
              <div className="text-2xl font-black">{formatCurrency(serviceTotal)}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Card className="border-slate-200 relative">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
              <div className="h-9 w-9 rounded-lg bg-slate-100 grid place-items-center"><Car className="h-5 w-5 text-muted-foreground"/></div>
              <div className="min-w-0">
                <p className="font-bold truncate">{initialService?.vehicleIdentifier}</p>
                 {vehicle && (
                  <p className="text-sm text-muted-foreground truncate">
                    {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.ownerName}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Trabajos a realizar</span>
                  <span className="text-muted-foreground">{(initialService?.serviceItems||[]).length} conceptos</span>
                </div>

                <div className="text-sm text-muted-foreground space-y-3 max-h-56 overflow-y-auto pr-3">
                  {(initialService?.serviceItems || []).map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 border-slate-200 bg-white">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                           <p className="font-medium text-foreground truncate">{item.name}</p>
                           {!!(item.suppliesUsed && item.suppliesUsed.length) && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              Insumos: {item.suppliesUsed.map((s:any) => `${s.quantity}× ${s.supplyName}`).join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-foreground whitespace-nowrap">{formatCurrency(item.price || 0)}</span>
                      </div>
                    </div>
                  ))}
                  {(!initialService?.serviceItems || initialService.serviceItems.length === 0) && (
                    <div className="text-center text-xs py-6 text-muted-foreground">Sin conceptos por mostrar</div>
                  )}
                </div>
              </div>

              <Separator className="my-4"/>
              <div className="flex justify-between items-center text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(serviceTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t flex-col-reverse sm:flex-row gap-2 justify-between items-center w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <div className="flex gap-2 justify-end flex-wrap">
                <TooltipProvider>
                    {initialService.publicId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}>
                            <ExternalLink className="h-6 w-6"/>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Ver Documento Público</p></TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip><TooltipTrigger asChild><Button size="icon" onClick={handleCopyWhatsApp} className="h-12 w-12 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"><Icon icon="logos:whatsapp-icon" className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Copiar para WhatsApp</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" onClick={handleNativeShare} className="h-12 w-12 bg-green-100 text-green-700 border-green-200 hover:bg-green-200"><Share2 className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Compartir</p></TooltipContent></Tooltip>
                    {!isMobile && (
                      <Tooltip><TooltipTrigger asChild><Button size="icon" onClick={() => window.print()} className="h-12 w-12 bg-red-100 text-red-700 border-red-200 hover:bg-red-200"><Printer className="h-6 w-6"/></Button></TooltipTrigger><TooltipContent><p>Imprimir</p></TooltipContent></Tooltip>
                    )}
                </TooltipProvider>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
