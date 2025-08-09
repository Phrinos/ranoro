"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Printer, MessageSquare, Link as LinkIcon, Car, Copy, ExternalLink, Share2 } from "lucide-react";
import type { ServiceRecord, Vehicle, WorkshopInfo } from "@/types";

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

const buildShareMessage = (svc: ServiceRecord, workshop?: Partial<WorkshopInfo>) => {
  const name = workshop?.name || "nuestro taller";
  const saludo = `Hola ${svc.customerName || "Cliente"}, aquí tienes los detalles de tu servicio en ${name}.`;
  const url = buildShareUrl(svc.publicId);
  const cuerpo = url
    ? `\n\nPuedes ver el detalle y firmar de conformidad aquí:\n${url}`
    : `\n\nFolio: ${svc.id}\nTotal: ${formatCurrency(svc.totalCost || 0)}`;
  const cierre = "\n\n¡Gracias por tu preferencia!";
  return `${saludo}${cuerpo}${cierre}`;
};

export function ShareServiceDialog({ open, onOpenChange, service: initialService, vehicle }: ShareServiceDialogProps) {
  const { toast } = useToast();
  const [workshopInfo, setWorkshopInfo] = React.useState<Partial<WorkshopInfo>>({});

  React.useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem("workshopTicketInfo");
    if (stored) {
      try { setWorkshopInfo(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [open]);

  const shareUrl = React.useMemo(() => buildShareUrl(initialService?.publicId), [initialService?.publicId]);
  const message = React.useMemo(() => buildShareMessage(initialService, workshopInfo), [initialService, workshopInfo]);

  const copy = async (text: string, label = "Copiado al portapapeles") => {
    try { await navigator.clipboard.writeText(text); toast({ title: label }); }
    catch { toast({ title: "No se pudo copiar", description: "Intenta de nuevo o pega manualmente.", variant: "destructive" }); }
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
      <DialogContent className="sm:max-w-xl md:max-w-2xl p-0 overflow-hidden">
        {/* Header visual */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-6 py-5">
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
              <div className="text-2xl font-black">{formatCurrency(initialService?.totalCost || 0)}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <Card className="border-slate-200">
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
                <span className="text-primary">{formatCurrency(initialService?.totalCost || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {initialService?.publicId && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Enlace público</p>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="bg-muted"/>
                <Button size="icon" variant="outline" onClick={() => copy(shareUrl, "Enlace copiado")}> <Copy className="h-4 w-4"/> </Button>
                <Button size="icon" variant="outline" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}> <ExternalLink className="h-4 w-4"/> </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <DialogFooter className="px-6 pb-6 pt-4 border-t flex-col sm:flex-row gap-2">
           <Button onClick={handleCopyWhatsApp} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                <MessageSquare className="mr-2 h-4 w-4"/> Copiar para WhatsApp
            </Button>
          <Button onClick={handleNativeShare} className="w-full sm:w-auto">
            <Share2 className="mr-2 h-4 w-4"/> Compartir
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4"/> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
