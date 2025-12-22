
// src/app/(public)/s/[id]/page.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ShieldAlert, Printer } from "lucide-react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebasePublic";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceSheetContent } from "@/components/shared/ServiceSheetContent";
import { SignatureDialog } from "@/app/(app)/servicios/components/signature-dialog";
import { AppointmentScheduler } from "@/components/shared/AppointmentScheduler";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { TicketContent } from "@/components/ticket-content";
import { Button } from "@/components/ui/button";
import {
  getPublicServiceData,
  scheduleAppointmentAction,
  confirmAppointmentAction,
  cancelAppointmentAction,
  saveSignatureAction,
} from "./actions";
import { isValid, parseISO } from "date-fns";

// ——— Tipado público mínimo ———
type PublicServiceDoc = {
  id?: string;
  serviceId?: string;
  publicId?: string;
  folio?: string;
  status?: string;
  subStatus?: string | null;
  customerName?: string;
  customerPhone?: string | number;
  serviceAdvisorSignatureDataUrl?: string | null;
  vehicleIdentifier?: string;
  receptionDateTime?: string | Date | Timestamp | null;
  deliveryDateTime?: string | Date | Timestamp | null;
  appointmentDateTime?: string | Date | Timestamp | null;
  appointmentStatus?: string | null;
  serviceAdvisorName?: string | null;
  serviceItems?: any[];
  customerComplaints?: any;
  recommendations?: any;
  total?: number;
  payments?: any;
  vehicle?: any | null;
  customerSignatureReception?: string | null;
  customerSignatureDelivery?: string | null;
  isPublic?: boolean;
  createdAt?: any;
  updatedAt?: any;
  nextServiceInfo?: any;
  mileage?: number;
};

const pickFirstText = (...vals: any[]) => {
  for (const v of vals) {
    if (v === null || v === undefined) continue;

    if (typeof v === "number" && Number.isFinite(v)) return String(v);

    if (typeof v === "string") {
      const s = v.trim();
      if (s && s.toLowerCase() !== "na") return s;
    }
  }
  return undefined;
};


const extractPlate = (s?: string | null) => {
  const t = (s ?? "").trim();
  if (!t) return null;
  const m = t.toUpperCase().match(/([A-Z0-9-]{5,10})$/);
  return m?.[1] ?? null;
};

const normalizeVehicle = (v: any) => {
  if (!v) return null;

  const rawPlate = pickFirstText(v.licensePlate, v.plates, v.placas);
  const plate = extractPlate(rawPlate);
  const titleFromRaw = plate ? rawPlate?.replace(new RegExp(`${plate}$`, "i"), "").trim() : rawPlate;

  return {
    ...v,
    make: pickFirstText(v.make, v.brand, v.marca) ?? "",
    model: pickFirstText(v.model, v.subModel, v.modelo, v.version) ?? "",
    year: pickFirstText(String(v.year ?? ""), String(v.anio ?? ""), String(v.año ?? ""), String(v.modelYear ?? "")) || "",
    licensePlate: plate ?? rawPlate ?? "",
    _titleFromRaw: titleFromRaw ?? "",
    ownerName: pickFirstText(v.ownerName, v.customerName, v.owner?.name, v.propietario) ?? "",
    ownerPhone: pickFirstText(v.ownerPhone, v.phone, v.telefono, v.owner?.phone) ?? "",
  };
};

export default function PublicServicePage() {
  const params = useParams();
  const publicId = decodeURIComponent((params?.id as string) ?? "");
  const { toast } = useToast();

  const [service, setService] = useState<PublicServiceDoc | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<"reception" | "delivery" | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [workshopInfo, setWorkshopInfo] = useState<any | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("workshopTicketInfo");
      if (stored) setWorkshopInfo(JSON.parse(stored));
    } catch (e) {
      console.error("Could not parse workshop info from storage", e);
    }

    if (!publicId) {
      setError("Enlace inválido.");
      setService(null);
      return;
    }

    if (!db) {
      setError("No hay conexión a la base de datos pública.");
      setService(null);
      return;
    }
    
    getPublicServiceData(publicId).catch((e) => console.warn("auto-repair failed:", e));

    const ref = doc(db, "publicServices", publicId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setService(null);
          setError("El servicio no fue encontrado o el enlace es incorrecto.");
          return;
        }
        setService({ id: snap.id, ...(snap.data() as PublicServiceDoc) });
        setError(null);
      },
      (err) => {
        console.error("onSnapshot error", err);
        setError("No se pudo escuchar actualizaciones del servicio.");
      }
    );
    return () => unsub();
  }, [publicId]);

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!service || !signatureType) return;
    setIsSigning(true);
    try {
      const result = await saveSignatureAction(publicId, signatureDataUrl, signatureType);
      if (!result?.success) throw new Error(result?.error);
      toast({ title: signatureType === "reception" ? "Firma de Recepción Guardada" : "Firma de Conformidad Guardada" });
    } catch (e: any) {
      toast({ title: "Error al Guardar Firma", description: e?.message ?? "No se pudo guardar la firma.", variant: "destructive" });
    } finally {
      setIsSigning(false);
      setSignatureType(null);
    }
  };

  const handleConfirmAppointment = async () => {
    if (!service) return;
    setIsConfirming(true);
    try {
      const result = await confirmAppointmentAction(publicId);
      if (!result?.success) throw new Error(result?.error);
      toast({ title: "Cita Confirmada", description: "¡Gracias! Hemos confirmado tu cita." });
    } catch (e: any) {
      toast({ title: "Error al Confirmar", description: e?.message ?? "No se pudo confirmar la cita.", variant: "destructive" });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!service) return;
    try {
      const result = await cancelAppointmentAction(publicId);
      if (!result?.success) throw new Error(result?.error);
      toast({ title: "Cita Cancelada", description: "Tu cita ha sido cancelada exitosamente." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "No se pudo cancelar la cita.", variant: "destructive" });
    }
  };

  const handleScheduleAppointment = async (selectedDateTime: Date) => {
    if (!service) return;
    try {
      const result = await scheduleAppointmentAction(publicId, selectedDateTime.toISOString());
      if (!result?.success) throw new Error(result?.error);
      toast({ title: "Cita Agendada", description: "Tu cita ha sido registrada." });
      setIsScheduling(false);
    } catch (e: any) {
      console.error("[CLIENT] Error in handleScheduleAppointment:", e);
      toast({ title: "Error al Agendar", description: e?.message ?? "No se pudo agendar la cita.", variant: "destructive" });
    }
  };

  const handleSignClick = (type: "reception" | "delivery") => {
    setSignatureType(type);
    setIsSigning(true);
  };

  const rawVehicle = (service as any)?.vehicle ?? null;
  const vehicle = normalizeVehicle(rawVehicle);

  const serviceForSheet = {
    ...service,
    customerPhone:
      pickFirstText(
        service?.customerPhone,
        (service as any)?.customer?.phone,
        (service as any)?.customer?.phoneNumber,
        (service as any)?.phone,
        (service as any)?.telefono,
        vehicle?.ownerPhone
      ) ?? service?.customerPhone,
  };


  if (service === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!service || error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-xl mx-auto text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">Error al Cargar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "No se pudo cargar el documento del servicio."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-4 sm:py-8">
        <ServiceSheetContent
          service={serviceForSheet as any}
          vehicle={vehicle as any}
          onScheduleClick={() => setIsScheduling(true)}
          onConfirmClick={handleConfirmAppointment}
          onCancelAppointment={handleCancelAppointment}
          isConfirming={isConfirming}
          onSignClick={handleSignClick}
          onShowTicketClick={() => setIsTicketDialogOpen(true)}
          isSigning={isSigning}
        />
      </div>

      <SignatureDialog
        open={isSigning}
        onOpenChange={(isOpen) => !isOpen && setIsSigning(false)}
        onSave={handleSaveSignature}
      />

      <AppointmentScheduler
        open={isScheduling}
        onOpenChange={setIsScheduling}
        onConfirm={handleScheduleAppointment}
      />

      <UnifiedPreviewDialog
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        title="Ticket de Servicio"
        footerContent={
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        }
        service={service as any}
      >
        <TicketContent
          ref={ticketContentRef}
          service={service as any}
          vehicle={vehicle as any}
          previewWorkshopInfo={workshopInfo}
        />
      </UnifiedPreviewDialog>
    </>
  );
}
