// src/components/shared/ShareServiceDialog.tsx
"use client";

import React, { useRef, useCallback, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ServiceRecord, Vehicle } from '@/types';
import {
  Copy, ExternalLink, Link2, Phone, Send,
  Image as ImageIcon, CheckCircle, MessageSquare,
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { useToast } from '@/hooks/use-toast';
import { ServiceSheetContent } from '../ServiceSheetContent';
import { Separator } from '../ui/separator';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketContent } from '../ticket-content';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface ShareServiceDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord | null;
  vehicle?: Vehicle | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize phone to E.164-like for WhatsApp: 521234567890 */
function normalizePhone(raw?: string | number | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 0) return null;
  // If already has country code (12+ digits, starts with 52 for MX)
  if (digits.length >= 12) return digits;
  // 10-digit MX number → prepend 52
  if (digits.length === 10) return `52${digits}`;
  // 11 digits starting with 1 (some old MX format) → prepend 52
  if (digits.length === 11 && digits.startsWith('1')) return `52${digits}`;
  return digits;
}

/** Format phone for display: (xxx) xxx-xxxx or raw */
function formatPhoneDisplay(raw?: string | number | null): string {
  if (!raw) return 'Sin teléfono';
  const d = String(raw).replace(/\D/g, '');
  // Show last 10 digits formatted
  const last10 = d.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return String(raw);
}

function getPublicUrl(service: ServiceRecord): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/s/${service.publicId || service.id}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ShareServiceDialog({ open, onOpenChange, service, vehicle }: ShareServiceDialogProps) {
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [previewType, setPreviewType] = useState<'sheet' | 'ticket'>('sheet');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // ── Derived data ──

  const customerPhone = useMemo(() => {
    if (!service) return null;
    return (
      (service as any).customerPhone ||
      (service as any).phone ||
      (vehicle as any)?.ownerPhone ||
      (vehicle as any)?.phone ||
      null
    );
  }, [service, vehicle]);

  const normalizedPhone = useMemo(() => normalizePhone(customerPhone), [customerPhone]);
  const displayPhone = useMemo(() => formatPhoneDisplay(customerPhone), [customerPhone]);

  const publicUrl = useMemo(() => (service ? getPublicUrl(service) : ''), [service]);

  const vehicleName = useMemo(() => {
    if (vehicle) return `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
    return service?.vehicleIdentifier || 'Vehículo';
  }, [vehicle, service]);

  const customerName = (service?.customerName || 'Cliente').trim();

  // ── Handlers ──

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      toast({ title: "Enlace copiado" });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: "Error al copiar", variant: "destructive" });
    }
  }, [publicUrl, toast]);

  const handleOpenAsClient = useCallback(() => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  }, [publicUrl]);

  const buildWhatsAppUrl = useCallback((message: string) => {
    if (!normalizedPhone) return null;
    return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;
  }, [normalizedPhone]);

  const handleSendLinkWhatsApp = useCallback(() => {
    const message = [
      `Hola ${customerName} 👋`,
      ``,
      `Te comparto el enlace para ver el estado y detalles de tu servicio para tu *${vehicleName}*:`,
      ``,
      publicUrl,
      ``,
      `Ahí podrás ver la cotización, el avance y firmar cuando sea necesario.`,
      ``,
      `¡Gracias por tu preferencia! 🚗✨`,
    ].join('\n');

    const url = buildWhatsAppUrl(message);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast({ title: "Sin número de teléfono", description: "Este cliente no tiene teléfono registrado.", variant: "destructive" });
    }
  }, [customerName, vehicleName, publicUrl, buildWhatsAppUrl, toast]);

  const handleSendTicketWhatsApp = useCallback(async () => {
    // Step 1: Copy ticket image to clipboard
    if (ticketRef.current) {
      try {
        const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: 'white', useCORS: true });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast({ title: "Ticket copiado al portapapeles", description: "Ahora pega la imagen en el chat de WhatsApp." });
        }
      } catch (err) {
        console.error("Error copying ticket image:", err);
        toast({ title: "No se pudo copiar la imagen", variant: "destructive" });
      }
    }

    // Step 2: Open WhatsApp with text
    const message = [
      `Hola ${customerName} 👋`,
      ``,
      `Aquí te envío el ticket de tu servicio para tu *${vehicleName}*.`,
      `(La imagen del ticket está copiada, pégala en este chat)`,
      ``,
      `También puedes ver todos los detalles aquí:`,
      publicUrl,
      ``,
      `¡Gracias por tu preferencia! 🚗`,
    ].join('\n');

    const url = buildWhatsAppUrl(message);
    if (url) {
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 500);
    }
  }, [customerName, vehicleName, publicUrl, buildWhatsAppUrl, toast]);

  const handleCopyTicketImage = useCallback(async () => {
    if (!ticketRef.current) {
      toast({ title: "Error", description: "No se puede generar la imagen del ticket.", variant: "destructive" });
      return;
    }
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2.5, backgroundColor: 'white', useCORS: true });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("No se pudo crear la imagen.");
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      toast({ title: "Ticket copiado", description: "La imagen del ticket se copió al portapapeles." });
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err) {
      console.error("Error copying image:", err);
      toast({ title: "Error", description: "No se pudo copiar la imagen del ticket.", variant: "destructive" });
    }
  }, [toast]);

  if (!service) return null;

  const isDelivered = service.status === 'Entregado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr]">

          {/* ── LEFT PANEL: Actions ──────────────────────────────── */}
          <div className="bg-muted/30 p-6 flex flex-col gap-5 border-r border-border/50">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Enlace del Servicio
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Comparte con el cliente el enlace para ver el avance, firmar y descargar su ticket.
              </DialogDescription>
            </DialogHeader>

            {/* ── Client info badge ── */}
            <div className="bg-card rounded-xl border p-3 space-y-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{customerName}</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={cn(
                  "font-mono text-xs",
                  normalizedPhone ? "text-foreground" : "text-destructive"
                )}>
                  {displayPhone}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>🚗</span>
                <span className="truncate">{vehicleName}</span>
              </div>
              {isDelivered && (
                <Badge variant="success" className="text-[10px] mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Entregado
                </Badge>
              )}
            </div>

            {/* ── Link section ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enlace Público</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 px-2.5 py-2 text-xs border rounded-lg bg-card text-muted-foreground font-mono truncate"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} className="h-9 w-9 shrink-0 bg-card">
                  {copiedLink ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button variant="outline" onClick={handleOpenAsClient} className="w-full h-9 text-xs bg-card gap-2">
                <ExternalLink className="h-3.5 w-3.5" /> Ver como cliente
              </Button>
            </div>

            <Separator />

            {/* ── WhatsApp section ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enviar por WhatsApp</label>
              <Button
                onClick={handleSendLinkWhatsApp}
                disabled={!normalizedPhone}
                className="w-full h-11 bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2 shadow-sm"
              >
                <Icon icon="logos:whatsapp-icon" className="h-5 w-5" />
                Enviar Enlace
              </Button>
              {isDelivered && (
                <Button
                  onClick={handleSendTicketWhatsApp}
                  disabled={!normalizedPhone}
                  variant="outline"
                  className="w-full h-11 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar Ticket por WhatsApp
                </Button>
              )}
              {!normalizedPhone && (
                <p className="text-[10px] text-destructive text-center">
                  ⚠ Sin teléfono registrado para este cliente
                </p>
              )}
            </div>

            <Separator />

            {/* ── Ticket image section ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ticket</label>
              <Button
                variant="outline"
                onClick={handleCopyTicketImage}
                disabled={!isDelivered}
                className="w-full h-10 gap-2 bg-card border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {copiedImage
                  ? <><CheckCircle className="h-4 w-4 text-green-600" /> ¡Copiado!</>
                  : <><ImageIcon className="h-4 w-4" /> Copiar Ticket como Imagen</>
                }
              </Button>
              {!isDelivered && (
                <p className="text-[10px] text-muted-foreground text-center">
                  El ticket estará disponible cuando el servicio esté entregado.
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Preview ─────────────────────────────── */}
          <div className="hidden md:flex flex-col bg-background max-h-[85vh]">
            <div className="px-4 py-3 border-b shrink-0">
              <Tabs value={previewType} onValueChange={(v) => setPreviewType(v as 'sheet' | 'ticket')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="sheet" className="text-xs">Vista del Cliente</TabsTrigger>
                  <TabsTrigger value="ticket" className="text-xs">Ticket</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {previewType === 'sheet' ? (
                <div className="bg-muted/20 rounded-lg p-3">
                  <ServiceSheetContent service={service} vehicle={vehicle} onCancelAppointment={() => {}} />
                </div>
              ) : (
                <div className="flex justify-center bg-muted/20 rounded-lg p-4">
                  <TicketContent ref={ticketRef} service={service} vehicle={vehicle || undefined} />
                </div>
              )}
            </div>
          </div>

          {/* ── Mobile preview (collapsed) ── */}
          <div className="md:hidden p-4 border-t">
            <Tabs value={previewType} onValueChange={(v) => setPreviewType(v as 'sheet' | 'ticket')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="sheet" className="text-xs">Vista del Cliente</TabsTrigger>
                <TabsTrigger value="ticket" className="text-xs">Ticket</TabsTrigger>
              </TabsList>
              <TabsContent value="sheet" className="mt-3 max-h-[40vh] overflow-y-auto">
                <ServiceSheetContent service={service} vehicle={vehicle} onCancelAppointment={() => {}} />
              </TabsContent>
              <TabsContent value="ticket" className="mt-3 max-h-[40vh] overflow-y-auto flex justify-center">
                <TicketContent ref={ticketRef} service={service} vehicle={vehicle || undefined} />
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
