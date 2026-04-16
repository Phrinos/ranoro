// src/app/(app)/ticket/components/WhatsAppSendModal.tsx
// Modal for sending a ticket via WhatsApp — shows client number + manual override field.
"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@iconify/react";
import { Phone, Send, User } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(raw?: string | number | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length >= 12) return digits;
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `52${digits}`;
  return digits;
}

function formatPhoneDisplay(raw?: string | number | null): string {
  if (!raw) return "";
  const d = String(raw).replace(/\D/g, "");
  const last10 = d.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return String(raw);
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return "";
  return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface WhatsAppSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled from the client record */
  clientPhone?: string | number | null;
  clientName?: string;
  vehicleName?: string;
  publicUrl?: string;
  /** Called before opening WhatsApp so the parent can copy the ticket image */
  onBeforeSend?: () => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WhatsAppSendModal({
  open,
  onOpenChange,
  clientPhone,
  clientName = "Cliente",
  vehicleName = "su vehículo",
  publicUrl = "",
  onBeforeSend,
}: WhatsAppSendModalProps) {
  const [manualPhone, setManualPhone] = useState("");
  const [isSending, setIsSending] = useState(false);

  const clientPhoneNormalized = normalizePhone(clientPhone);

  const buildMessage = useCallback(
    () =>
      [
        `Hola ${clientName} 👋`,
        ``,
        `Aquí te envío el ticket de tu servicio para tu *${vehicleName}*.`,
        `(La imagen del ticket está copiada, pégala en este chat)`,
        ``,
        publicUrl ? `También puedes ver todos los detalles aquí:\n${publicUrl}` : "",
        ``,
        `¡Gracias por tu preferencia! 🚗`,
      ]
        .filter((l) => l !== undefined)
        .join("\n"),
    [clientName, vehicleName, publicUrl]
  );

  const handleSend = useCallback(
    async (phoneToSend: string) => {
      const normalized = normalizePhone(phoneToSend);
      if (!normalized) return;

      setIsSending(true);
      try {
        if (onBeforeSend) await onBeforeSend();
        const url = buildWhatsAppUrl(phoneToSend, buildMessage());
        if (url) {
          setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 300);
        }
        onOpenChange(false);
      } finally {
        setIsSending(false);
      }
    },
    [onBeforeSend, buildMessage, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="logos:whatsapp-icon" className="h-5 w-5" />
            Enviar por WhatsApp
          </DialogTitle>
          <DialogDescription>
            Se copiará la imagen del ticket y se abrirá WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Client number */}
          {clientPhoneNormalized ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Número del cliente
              </Label>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clientName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatPhoneDisplay(clientPhone)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={isSending}
                  className="bg-[#25D366] hover:bg-[#1ebe57] text-white gap-1.5 shrink-0"
                  onClick={() => handleSend(String(clientPhone))}
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              ⚠ Este cliente no tiene número de teléfono registrado.
            </p>
          )}

          <Separator />

          {/* Manual phone */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Enviar a otro número
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="10 dígitos sin espacios"
                  className="pl-9 text-sm"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualPhone.length >= 10) {
                      handleSend(manualPhone);
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                disabled={isSending || manualPhone.length < 10}
                className="bg-[#25D366] hover:bg-[#1ebe57] text-white gap-1.5 shrink-0"
                onClick={() => handleSend(manualPhone)}
              >
                <Send className="h-3.5 w-3.5" />
                Enviar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Introduce los 10 dígitos del número de destino (MX).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
