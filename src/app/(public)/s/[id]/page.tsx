
// src/app/(public)/s/[id]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ShieldAlert, Printer } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebasePublic"; // SDK público (cliente)
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceRecord, Vehicle } from "@/types";
import { ServiceSheetContent } from "@/components/shared/ServiceSheetContent";
import { SignatureDialog } from "@/app/(app)/servicios/components/signature-dialog";
import { AppointmentScheduler } from "@/components/shared/AppointmentScheduler";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { TicketContent } from "@/components/ticket-content";
import { Button } from "@/components/ui/button";

export default function PublicServicePage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();

  const [service, setService] = useState<ServiceRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<"reception" | "delivery" | null>(null);

  const [isScheduling, setIsScheduling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const ticketContentRef = useRef<HTMLDivElement>(null);

  // --- Leer doc público ---
  const fetchServiceData = useCallback(async () => {
    try {
      if (!publicId) return;
      const ref = doc(db, "publicServices", publicId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setService(null);
        setError("El servicio no fue encontrado o el enlace es incorrecto.");
        return;
      }
      
      const serviceData = { id: snap.id, ...(snap.data() as ServiceRecord) };
      setService(serviceData);
      setError(null);
    } catch (e: any) {
      console.error("getPublicServiceData", e?.code, e?.message);
      setService(null);
      setError(
        e?.code === "permission-denied"
          ? "No hay permisos para leer este servicio. Revisa reglas/isPublic."
          : "Ocurrió un error al cargar la información del servicio."
      );
    }
  }, [publicId]);

  useEffect(() => {
    if (!publicId) {
      setError("Enlace inválido.");
      setService(null);
      return;
    }
    fetchServiceData();
  }, [publicId, fetchServiceData]);

  // --- Guardar firma (coincide con tus reglas) ---
  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!service || !signatureType) return;
    setIsSigning(true);
    try {
      const ref = doc(db, "publicServices", publicId);
      const field =
        signatureType === "reception"
          ? { customerSignatureReception: signatureDataUrl }
          : { customerSignatureDelivery: signatureDataUrl };
      await updateDoc(ref, field);
      toast({
        title: signatureType === "reception" ? "Firma de Recepción Guardada" : "Firma de Conformidad Guardada",
      });
      await fetchServiceData();
    } catch (e: any) {
      toast({
        title: "Error al Guardar Firma",
        description: e?.message ?? "No se pudo guardar la firma.",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
      setSignatureType(null);
    }
  };

  // --- Confirmar/CANCELAR cita (usa appointmentStatus) ---
  const handleConfirmAppointment = async () => {
    if (!service) return;
    setIsConfirming(true);
    try {
      const ref = doc(db, "publicServices", publicId);
      await updateDoc(ref, { appointmentStatus: "Confirmed" }); // 'Confirmed' o el valor que uses en tus reglas
      toast({ title: "Cita Confirmada", description: "¡Gracias! Hemos confirmado tu cita." });
      await fetchServiceData();
    } catch (e: any) {
      toast({
        title: "Error al Confirmar",
        description: e?.message ?? "No se pudo confirmar la cita.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelAppointment = useCallback(async () => {
    if (!service) return;
    try {
      const ref = doc(db, "publicServices", publicId);
      await updateDoc(ref, { appointmentStatus: "Canceled" }); // 'Canceled' o el valor que uses
      toast({ title: "Cita Cancelada", description: "Tu cita ha sido cancelada exitosamente." });
      await fetchServiceData();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "No se pudo cancelar la cita.",
        variant: "destructive",
      });
    }
  }, [publicId, service, toast, fetchServiceData]);

  // --- Agendar cita (usa appointmentDateTime + appointmentStatus) ---
  const handleScheduleAppointment = async (selectedDateTime: Date) => {
    if (!service) return;
    try {
      const ref = doc(db, "publicServices", publicId);
      await updateDoc(ref, {
        appointmentDateTime: selectedDateTime.toISOString(),
        appointmentStatus: "scheduled",
      }); // permitido por reglas
      toast({ title: "Cita Agendada", description: "Tu cita ha sido registrada." });
      setIsScheduling(false);
      await fetchServiceData();
    } catch (e: any) {
      toast({
        title: "Error al Agendar",
        description: e?.message ?? "No se pudo agendar la cita.",
        variant: "destructive",
      });
    }
  };

  const handleSignClick = (type: "reception" | "delivery") => {
    setSignatureType(type);
    setIsSigning(true);
  };
  
  // The vehicle data is now part of the denormalized service object
  const vehicle: Vehicle | null = service?.vehicle || null;


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
          service={service}
          vehicle={vehicle}
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
        service={service}
      >
        <TicketContent
          ref={ticketContentRef}
          service={service}
          vehicle={vehicle as any}
          previewWorkshopInfo={service.workshopInfo}
        />
      </UnifiedPreviewDialog>
    </>
  );
}

    