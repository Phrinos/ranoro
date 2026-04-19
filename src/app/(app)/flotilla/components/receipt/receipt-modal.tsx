// src/app/(app)/flotilla/components/receipt/receipt-modal.tsx
"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle, Share2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { capitalizeWords, formatCurrency } from "@/lib/utils";
import type { RentalPayment, Driver, Vehicle } from "@/types";
import { PaymentReceipt } from "./payment-receipt";
import { WhatsAppSendModal } from "@/app/(app)/ticket/components/WhatsAppSendModal";

export interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: RentalPayment | null;
  driver: Driver | null;
  vehicle: Vehicle | null;
  monthBalance: number;
  totalPaidThisMonth?: number;
  totalChargesThisMonth?: number;
  dailyRate?: number;
}

export function ReceiptModal({
  open, onOpenChange,
  payment, driver, vehicle,
  monthBalance, totalPaidThisMonth, totalChargesThisMonth, dailyRate,
}: ReceiptModalProps) {
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("workshopTicketInfo");
      if (stored) setBranding(JSON.parse(stored));
    } catch {}
    setIsMobile(/iPhone|iPad|Android/i.test(navigator.userAgent));
  }, []);

  const paymentDateObj = payment?.paymentDate
    ? (() => { try { const d = parseISO(payment.paymentDate); return isValid(d) ? d : new Date(); } catch { return new Date(); } })()
    : new Date();
  const monthLabel = capitalizeWords(format(paymentDateObj, "MMMM yyyy", { locale: es }));

  const captureBlob = useCallback(async (): Promise<Blob> => {
    if (!ticketRef.current) throw new Error("No ref");
    const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: "white", useCORS: true, logging: false });
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed")), "image/png");
    });
  }, []);

  const captureFile = useCallback(async (): Promise<File> => {
    const blob = await captureBlob();
    return new File([blob], `recibo-renta-${driver?.name?.replace(/\s+/g, "-") ?? "conductor"}.png`, { type: "image/png" });
  }, [captureBlob, driver]);

  const handleCopyImage = useCallback(async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": captureBlob() as any })]);
      setCopiedImage(true);
      toast({ title: "Imagen copiada" });
      setTimeout(() => setCopiedImage(false), 2500);
    } catch {
      toast({ title: "Error al copiar", variant: "destructive" });
    }
  }, [captureBlob, toast]);

  const handleWhatsApp = useCallback(async () => {
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ files: [await captureFile()], title: `Recibo — ${driver?.name}` });
      } catch (e: any) {
        if (e?.name !== "AbortError") toast({ title: "Error al compartir", variant: "destructive" });
      }
    } else {
      setWhatsappOpen(true);
    }
  }, [isMobile, captureFile, driver, toast]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ files: [await captureFile()], title: `Recibo — ${driver?.name}` });
      } catch (e: any) {
        if (e?.name !== "AbortError") toast({ title: "Error al compartir", variant: "destructive" });
      }
    } else {
      await handleCopyImage();
    }
  }, [captureFile, driver, toast, handleCopyImage]);

  const handleBeforeWhatsApp = useCallback(async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": captureBlob() as any })]);
      toast({ title: "Imagen copiada", description: "Pégala en WhatsApp." });
    } catch {}
  }, [captureBlob, toast]);

  if (!payment || !driver) return null;

  const vehicleName = vehicle
    ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`
    : payment.vehicleLicensePlate ?? "Vehículo";

  const receiptProps = {
    payment, driver,
    vehicle: vehicle ?? undefined,
    driverBalance: monthBalance,
    totalPaidThisMonth,
    totalChargesThisMonth,
    dailyRate,
    currentMonthLabel: monthLabel,
    previewBranding: branding ?? undefined,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="flex flex-col md:grid md:grid-cols-[280px_1fr]">
            {/* ── LEFT: Actions */}
            <div className="bg-muted/30 p-5 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-border/50">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base">Recibo de Pago</DialogTitle>
                <DialogDescription className="text-xs">Copia o comparte el recibo de renta.</DialogDescription>
              </DialogHeader>

              {/* Info card */}
              <div className="bg-card rounded-xl border p-3 space-y-1.5">
                <p className="text-sm font-semibold truncate">{driver.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🗓️</span>
                  <span className="font-semibold text-foreground">{monthLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🚗</span>
                  <span className="truncate">{vehicleName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>💰</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(payment.amount)}
                  </span>
                  <span>— Abono</span>
                </div>
              </div>

              {/* Copy as image */}
              <Button
                variant="outline"
                onClick={handleCopyImage}
                className="w-full gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
              >
                {copiedImage
                  ? <><CheckCircle className="h-4 w-4 text-green-600" /> ¡Copiado!</>
                  : <><Copy className="h-4 w-4" /> Copiar como Imagen</>}
              </Button>

              <Separator />

              {/* Share section */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Compartir</label>
                <Button
                  onClick={handleWhatsApp}
                  className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2 shadow-sm"
                >
                  <Icon icon="logos:whatsapp-icon" className="h-5 w-5" />
                  {isMobile ? "Enviar por WhatsApp" : "Enviar al Conductor"}
                </Button>
                <Button variant="outline" onClick={handleShare} className="w-full gap-2">
                  <Share2 className="h-4 w-4" />
                  Compartir como Imagen
                </Button>
              </div>
            </div>

            {/* ── RIGHT: 80mm preview */}
            <div className="hidden md:flex flex-col bg-neutral-100 max-h-[90vh]">
              <div className="px-4 py-3 border-b bg-background shrink-0">
                <p className="text-sm font-medium">Vista previa — 80mm</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="flex justify-center p-6">
                  <div className="shadow-xl rounded-sm">
                    <PaymentReceipt {...receiptProps} />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Off-screen renderer for html2canvas */}
          <div className="fixed top-0 left-[200vw]">
            <div ref={ticketRef} className="bg-white">
              <PaymentReceipt {...receiptProps} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WhatsAppSendModal
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        clientPhone={driver.phone ?? null}
        clientName={driver.name}
        vehicleName={vehicleName}
        publicUrl=""
        onBeforeSend={handleBeforeWhatsApp}
      />
    </>
  );
}
