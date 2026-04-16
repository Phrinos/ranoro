// src/app/(app)/flotillav2/components/FleetTicketModal.tsx
// Rental payment ticket modal — styled like TicketPreviewModal (80mm preview + actions)
"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle, Printer, MessageSquare } from "lucide-react";
import { Icon } from "@iconify/react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import type { RentalPayment, Driver, Vehicle } from "@/types";
import { RentalPaymentTicket } from "./RentalPaymentTicket";
import { WhatsAppSendModal } from "@/app/(app)/ticket/components/WhatsAppSendModal";

interface FleetTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: RentalPayment | null;
  driver: Driver | null;
  vehicle: Vehicle | null;
  /** Balance del mes actual del conductor (no total) */
  monthBalance: number;
}

export function FleetTicketModal({
  open,
  onOpenChange,
  payment,
  driver,
  vehicle,
  monthBalance,
}: FleetTicketModalProps) {
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("workshopTicketInfo");
      if (stored) setBranding(JSON.parse(stored));
    } catch {}
  }, []);

  const captureImage = useCallback(async (): Promise<Blob | null> => {
    if (!ticketRef.current) return null;
    const canvas = await html2canvas(ticketRef.current, {
      scale: 2.5,
      backgroundColor: "white",
      useCORS: true,
    });
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  }, []);

  const handleCopyImage = useCallback(async () => {
    try {
      const blob = await captureImage();
      if (!blob) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedImage(true);
      toast({ title: "Imagen copiada al portapapeles" });
      setTimeout(() => setCopiedImage(false), 2500);
    } catch {
      toast({ title: "Error al copiar", variant: "destructive" });
    }
  }, [captureImage, toast]);

  const handleBeforeWhatsApp = useCallback(async () => {
    try {
      const blob = await captureImage();
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast({ title: "Imagen copiada", description: "Pégala en el chat de WhatsApp." });
      }
    } catch {}
  }, [captureImage, toast]);

  const handlePrint = useCallback(() => window.print(), []);

  if (!payment || !driver) return null;

  const customerPhone = driver.phone || null;
  const vehicleName = vehicle
    ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`
    : payment.vehicleLicensePlate || "Vehículo";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">

            {/* ── LEFT: Actions */}
            <div className="bg-muted/30 p-5 flex flex-col gap-4 border-r border-border/50">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base flex items-center gap-2">
                  <Printer className="h-4 w-4 text-primary" />
                  Ticket de Pago
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed">
                  Imprime, copia o comparte el recibo de renta.
                </DialogDescription>
              </DialogHeader>

              {/* Info card */}
              <div className="bg-card rounded-xl border p-3 space-y-1.5">
                <p className="text-sm font-semibold truncate">{driver.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🚗</span>
                  <span className="truncate">{vehicleName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>💰</span>
                  <span className="font-mono font-bold text-foreground">
                    ${payment.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                  <span>— Abono</span>
                </div>
              </div>

              {/* Print */}
              <Button variant="outline" onClick={handlePrint} className="w-full gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Ticket
              </Button>

              {/* Copy as image */}
              <Button
                variant="outline"
                onClick={handleCopyImage}
                className="w-full gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {copiedImage ? (
                  <><CheckCircle className="h-4 w-4 text-green-600" /> ¡Copiado!</>
                ) : (
                  <><Copy className="h-4 w-4" /> Copiar como Imagen</>
                )}
              </Button>

              <Separator />

              {/* WhatsApp */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Enviar por WhatsApp
                </label>
                <Button
                  onClick={() => setWhatsappOpen(true)}
                  className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2 shadow-sm"
                >
                  <Icon icon="logos:whatsapp-icon" className="h-5 w-5" />
                  Enviar al Conductor
                </Button>
              </div>
            </div>

            {/* ── RIGHT: 80mm Preview — identical to TicketPreviewModal */}
            <div className="hidden md:flex flex-col bg-neutral-100 max-h-[90vh]">
              <div className="px-4 py-3 border-b bg-background shrink-0">
                <p className="text-sm font-medium">Vista previa — 80mm</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="flex justify-center p-6">
                  <div className="shadow-xl rounded-sm">
                    <RentalPaymentTicket
                      ref={ticketRef}
                      payment={payment}
                      driver={driver}
                      vehicle={vehicle ?? undefined}
                      driverBalance={monthBalance}
                      previewBranding={branding ?? undefined}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <WhatsAppSendModal
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        clientPhone={customerPhone}
        clientName={driver.name}
        vehicleName={vehicleName}
        publicUrl=""
        onBeforeSend={handleBeforeWhatsApp}
      />
    </>
  );
}
