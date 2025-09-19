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
import { Terminal, Send } from "lucide-react";
import type { ServiceRecord, Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface NotificationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord | null;
  vehicle: Vehicle | null;
}

// Plantillas de mensajes
const getMessageTemplates = (service: ServiceRecord, vehicle: Vehicle | null) => {
  const customerName = service.customerName || "Cliente";
  const vehicleDesc = vehicle ? `${vehicle.brand} ${vehicle.model}` : "su vehículo";
  const total = (service.total || 0).toFixed(2);
  const workshopName = "Ranoro"; // TODO: Obtener de la configuración del taller

  return [
    {
      title: "Servicio Listo para Entrega",
      message: `¡Hola ${customerName}! Le informamos que ${vehicleDesc} está listo para ser recogido en ${workshopName}.\n\nEl monto a pagar es de $${total}.\n\n¡Gracias por su preferencia!`,
    },
    {
      title: "Cotización Lista",
      message: `¡Hola ${customerName}! Su cotización para ${vehicleDesc} está lista para su revisión. Puede verla y aprobarla en el siguiente enlace:\n\n[ENLACE_AQUI]\n\nAtentamente, ${workshopName}.`,
    },
    {
      title: "Recordatorio de Cita",
      message: `¡Hola ${customerName}! Le recordamos su cita en ${workshopName} para ${vehicleDesc} el día [FECHA] a las [HORA].\n\n¡Le esperamos!`,
    },
  ];
};

export function NotificationDialog({ isOpen, onOpenChange, service, vehicle }: NotificationDialogProps) {
  const [customMessage, setCustomMessage] = React.useState("");
  const { toast } = useToast();

  const templates = service ? getMessageTemplates(service, vehicle) : [];
  
  // Efecto para resetear el mensaje personalizado cuando cambia el servicio
  React.useEffect(() => {
    if (isOpen) {
      // Por defecto, seleccionamos la primera plantilla
      setCustomMessage(templates[0]?.message || "");
    }
  }, [isOpen, service, templates]);

  const handleSend = () => {
    if (!service || !service.customerPhone) {
      toast({ title: "Error", description: "El cliente no tiene un número de teléfono guardado.", variant: "destructive" });
      return;
    }

    // Limpiar el número de teléfono
    const phoneNumber = service.customerPhone.replace(/\D/g, '');
    if (phoneNumber.length < 10) {
        toast({ title: "Error", description: "El número de teléfono no es válido.", variant: "destructive" });
        return;
    }

    const encodedMessage = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notificar al Cliente por WhatsApp</DialogTitle>
          <DialogDescription>
            Selecciona una plantilla o escribe un mensaje. Se abrirá WhatsApp para que confirmes el envío.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Enviando a: {service.customerName}</AlertTitle>
          <AlertDescription>
            Número de teléfono: <strong>{service.customerPhone || "No disponible"}</strong>
          </AlertDescription>
        </Alert>

        <div className="my-4">
          <p className="mb-2 text-sm font-medium">Plantillas Rápidas</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <Button key={template.title} variant="outline" size="sm" onClick={() => setCustomMessage(template.message)}>
                {template.title}
              </Button>
            ))}
          </div>
        </div>

        <Textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={8}
          placeholder="Escribe tu mensaje aquí..."
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={!service.customerPhone}>
            <Send className="mr-2 h-4 w-4" /> Preparar Envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
