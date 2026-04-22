// src/app/(app)/ticket/components/TicketPreviewModal.tsx
// Unified ticket preview + share dialog (replaces ShareServiceDialog).
"use client";

import React, { useRef, useCallback, useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  ExternalLink,
  Link2,
  Phone,
  CheckCircle,
  Image as ImageIcon,
  Printer,
  MessageSquare,
  Share2,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import type { SaleReceipt, ServiceRecord, Vehicle } from "@/types";
import { TicketContent } from "./TicketContent";
import { WhatsAppSendModal } from "./WhatsAppSendModal";
import type { TicketSettings } from "@/lib/constants/app";
import { defaultTicketSettings } from "@/lib/constants/app";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(raw?: string | number | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits.length) return null;
  if (digits.length >= 12) return digits;
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `52${digits}`;
  return digits;
}

function formatPhoneDisplay(raw?: string | number | null): string {
  if (!raw) return "Sin teléfono";
  const d = String(raw).replace(/\D/g, "");
  const last10 = d.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return String(raw);
}

function getPublicUrl(service: ServiceRecord): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/s/${service.publicId || service.id}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TicketPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass either a service or a sale */
  service?: ServiceRecord | null;
  sale?: SaleReceipt | null;
  vehicle?: Vehicle | null;
  /** Override workshop branding */
  workshopInfo?: Partial<TicketSettings>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TicketPreviewModal({
  open,
  onOpenChange,
  service,
  sale,
  vehicle,
  workshopInfo,
}: TicketPreviewModalProps) {
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMobile(/iPhone|iPad|Android/i.test(navigator.userAgent));
    }
  }, []);

  // Branding from localStorage (same key used by ticket config page)
  const [branding, setBranding] = useState<Partial<TicketSettings>>(defaultTicketSettings);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("workshopTicketInfo");
      if (stored) setBranding(JSON.parse(stored));
    } catch {}
  }, []);

  const mergedWorkshopInfo = workshopInfo ?? branding;

  // ── Derived info ──
  const customerPhone = useMemo(() => {
    if (service) {
      return (
        (service as any).customerPhone ||
        (service as any).phone ||
        (vehicle as any)?.ownerPhone ||
        null
      );
    }
    if (sale) return (sale as any).customerPhone || null;
    return null;
  }, [service, sale, vehicle]);

  const normalizedPhone = useMemo(() => normalizePhone(customerPhone), [customerPhone]);
  const displayPhone = useMemo(() => formatPhoneDisplay(customerPhone), [customerPhone]);

  const customerName = useMemo(() => {
    return (service?.customerName || (sale as any)?.customerName || "Cliente").trim();
  }, [service, sale]);

  const vehicleName = useMemo(() => {
    if (vehicle) return `${vehicle.make || ""} ${vehicle.model || ""} ${vehicle.year || ""}`.trim();
    return service?.vehicleIdentifier || "Vehículo";
  }, [vehicle, service]);

  const publicUrl = useMemo(
    () => (service ? getPublicUrl(service) : ""),
    [service]
  );

  const isDelivered = service?.status === "Entregado";

  const captureTicketImagePromise = useCallback(async (): Promise<Blob> => {
    if (!ticketRef.current) throw new Error("No ticket ref");
    const canvas = await html2canvas(ticketRef.current, {
      scale: 2.5,
      backgroundColor: "white",
      useCORS: true,
      logging: false,
    });
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });
  }, []);

  const captureImageFile = useCallback(async (): Promise<File> => {
    const blob = await captureTicketImagePromise();
    const name = (customerName || 'ticket').replace(/\s+/g, '-').toLowerCase();
    return new File([blob], `ticket-${name}.png`, { type: "image/png" });
  }, [captureTicketImagePromise, customerName]);

  const handleCopyTicketImage = useCallback(async () => {
    try {
      const item = new ClipboardItem({
        "image/png": captureTicketImagePromise() as any
      });
      await navigator.clipboard.write([item]);
      setCopiedImage(true);
      toast({ title: "Ticket copiado", description: "Imagen copiada al portapapeles." });
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.error("Error copying ticket:", err);
      toast({ title: "Error", description: "No se pudo copiar la imagen del ticket.", variant: "destructive" });
    }
  }, [captureTicketImagePromise, toast]);

  const handleBeforeWhatsApp = useCallback(async () => {
    try {
      const item = new ClipboardItem({
        "image/png": captureTicketImagePromise() as any
      });
      await navigator.clipboard.write([item]);
      toast({ title: "Imagen copiada", description: "Pégala en el chat de WhatsApp." });
    } catch {
      // Non-fatal: user may not have clipboard write support
    }
  }, [captureTicketImagePromise, toast]);

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      toast({ title: "Enlace copiado" });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast({ title: "Error al copiar", variant: "destructive" });
    }
  }, [publicUrl, toast]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        const file = await captureImageFile();
        await navigator.share({ files: [file], title: `Ticket — ${customerName}` });
      } catch (e: any) {
        if (e?.name !== "AbortError") toast({ title: "Error al compartir", variant: "destructive" });
      }
    } else {
      await handleCopyTicketImage();
    }
  }, [captureImageFile, customerName, toast, handleCopyTicketImage]);

  const handlePrint = useCallback(() => window.print(), []);

  const handleOpenAsClient = useCallback(() => {
    if (publicUrl) window.open(publicUrl, "_blank", "noopener,noreferrer");
  }, [publicUrl]);

  if (!service && !sale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]">

            {/* ── LEFT PANEL: Actions ───────────────────────────── */}
            <div className="bg-muted/30 p-5 flex flex-col gap-4 border-r border-border/50">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base flex items-center gap-2">
                  <Printer className="h-4 w-4 text-primary" />
                  Ticket de Servicio
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed">
                  Imprime, copia o comparte el ticket del servicio.
                </DialogDescription>
              </DialogHeader>

              {/* Client card */}
              <div className="bg-card rounded-xl border p-3 space-y-1.5">
                <p className="text-sm font-semibold truncate">{customerName}</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={cn(
                    "font-mono text-xs",
                    normalizedPhone ? "text-foreground" : "text-destructive"
                  )}>
                    {displayPhone}
                  </span>
                </div>
                {vehicleName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>🚗</span>
                    <span className="truncate">{vehicleName}</span>
                  </div>
                )}
                {isDelivered && (
                  <Badge variant="success" className="text-[10px] mt-1">
                    <CheckCircle className="h-3 w-3 mr-1" /> Entregado
                  </Badge>
                )}
              </div>



              {/* Copy image */}
              <Button
                variant="outline"
                onClick={handleCopyTicketImage}
                className="w-full gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {copiedImage
                  ? <><CheckCircle className="h-4 w-4 text-green-600" /> ¡Copiado!</>
                  : <><ImageIcon className="h-4 w-4" /> Copiar como Imagen</>}
              </Button>

              <Separator />

              {/* Public link */}
              {publicUrl && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Enlace Público
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      readOnly
                      value={publicUrl}
                      className="flex-1 px-2.5 py-2 text-xs border rounded-lg bg-card text-muted-foreground font-mono truncate"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLink} className="h-9 w-9 shrink-0 bg-card">
                      {copiedLink
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={handleOpenAsClient} className="w-full h-9 text-xs bg-card gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver como cliente
                  </Button>
                </div>
              )}

              <Separator />

              {/* WhatsApp */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Compartir
                </label>
                <Button
                  onClick={() => setWhatsappOpen(true)}
                  className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2 shadow-xs"
                >
                  <Icon icon="logos:whatsapp-icon" className="h-5 w-5" />
                  Enviar Ticket
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="w-full gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Compartir como Imagen
                </Button>
              </div>
            </div>

            {/* ── RIGHT PANEL: 80mm Preview ─────────────────────── */}
            <div className="hidden md:flex flex-col bg-neutral-100 max-h-[90vh]">
              <div className="px-4 py-3 border-b bg-background shrink-0">
                <p className="text-sm font-medium">Vista previa — 80mm</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="flex justify-center p-6">
                  <div className="shadow-xl rounded-sm">
                    <TicketContent
                      service={service ?? undefined}
                      sale={sale ?? undefined}
                      vehicle={vehicle ?? undefined}
                      previewWorkshopInfo={mergedWorkshopInfo}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>

          </div>

          {/* ── OFF-SCREEN RENDERER FOR HTML2CANVAS ─────────────────────── */}
          <div className="fixed top-0 left-[200vw]">
             <div ref={ticketRef} className="bg-white">
               <TicketContent
                 service={service ?? undefined}
                 sale={sale ?? undefined}
                 vehicle={vehicle ?? undefined}
                 previewWorkshopInfo={mergedWorkshopInfo}
               />
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp send sub-modal */}
      <WhatsAppSendModal
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        clientPhone={customerPhone}
        clientName={customerName}
        vehicleName={vehicleName}
        publicUrl={publicUrl}
        onBeforeSend={handleBeforeWhatsApp}
      />
    </>
  );
}
