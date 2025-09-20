
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Send, Construction } from "lucide-react";
import type { ServiceRecord, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface NotificationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord | null;
  vehicle: Vehicle | null;
}

export function NotificationDialog({ isOpen, onOpenChange, service, vehicle }: NotificationDialogProps) {
  const { toast } = useToast();

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Notificar al Cliente por WhatsApp</DialogTitle>
          <DialogDescription>
            Envía al cliente un mensaje a través de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Enviando a: {service.customerName}</AlertTitle>
          <AlertDescription>
            Número de teléfono: <strong>{service.customerPhone || "No disponible"}</strong>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted/50">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Función en Desarrollo</h3>
          <p className="text-sm text-muted-foreground mt-1">
            La integración con la API de WhatsApp para el envío automático de mensajes estará disponible próximamente.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button disabled>
            <Send className="mr-2 h-4 w-4" /> Preparar Envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
