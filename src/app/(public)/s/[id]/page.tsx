
// src/app/(public)/s/[id]/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ServiceSheetContent } from "@/components/shared/ServiceSheetContent";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Save, Car as CarIcon, Key, PenTool, User, Phone } from "lucide-react";
import { AppointmentScheduler } from "@/components/shared/AppointmentScheduler";
import { TicketPreviewModal } from "@/app/(app)/ticket/components";
import {
  getPublicServiceData,
  scheduleAppointmentAction,
  confirmAppointmentAction,
  cancelAppointmentAction,
  saveSignatureAction,
} from "../actions";
import { isValid, parseISO } from "date-fns";

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

const pickFirstText = (...vals: any[]): string | undefined => {
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

function AutoSignatureModal({
  open,
  onOpenChange,
  onSave,
  type,
  service,
  vehicle
}: {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: string) => void;
  type: "reception" | "delivery" | null;
  service: any;
  vehicle: any;
}) {
  const sigCanvas = React.useRef<any>(null);
  const { toast } = useToast();

  const handleClear = () => sigCanvas.current?.clear();

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast({ title: "Firma requerida", description: "Por favor, trace su firma en el recuadro.", variant: "destructive" });
      return;
    }
    const data = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (data) onSave(data);
  };

  if (!type || !service) return null;

  // Better extraction of Vehicle Info
  const idSplit = (() => {
    const s = service?.vehicleIdentifier ?? "";
    const t = s.trim();
    if (!t) return { title: "", plate: null };
    const m = t.toUpperCase().match(/([A-Z0-9-]{5,10})$/);
    const plate = m?.[1] ?? null;
    const title = plate ? t.replace(new RegExp(`${plate}$`, "i"), "").trim() : t;
    return { title, plate };
  })();

  const plateFromVehicle = vehicle?.licensePlate ? String(vehicle.licensePlate).trim() : null;
  const vehicleLicensePlate = plateFromVehicle ?? idSplit.plate ?? service?.folio ?? "Sin placas";

  const composedTitle = `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim();
  const vehicleTitle =
      (composedTitle ? `${composedTitle}${vehicle?.year ? ` (${vehicle.year})` : ""}` : "") ||
      idSplit.title ||
      "Vehículo en Taller";

  const isReception = type === "reception";
  const title = isReception ? "Autorización de Ingreso" : "Conformidad de Entrega";
  const description = isReception 
    ? "Acepto que las condiciones del vehículo anotadas en mi orden de servicio son correctas y autorizo a realizar los diagnósticos y/o reparaciones."
    : "Recibo mi vehículo a mi entera satisfacción y acepto los términos de garantía indicados en mi comprobante de servicio.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border-0">
        
        {/* Dynamic Header Gradient & Policy Text */}
        <div className={`relative p-5 pb-4 border-b ${isReception ? 'bg-linear-to-b from-primary/10 to-white border-primary/10' : 'bg-linear-to-b from-green-500/10 to-white border-green-500/10'}`}>
          <DialogTitle className={`text-xl font-black flex items-center gap-2.5 ${isReception ? 'text-primary' : 'text-green-700'}`}>
            <div className={`p-2 rounded-xl shadow-xs ${isReception ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-600'}`}>
              {isReception ? <PenTool className="h-5 w-5" /> : <Key className="h-5 w-5" />}
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className={`mt-3 p-3 rounded-xl border font-semibold text-xs leading-relaxed shadow-xs ${isReception ? 'bg-amber-50/80 text-amber-900 border-amber-100/50' : 'bg-blue-50/80 text-blue-900 border-blue-100/50'}`}>
            {description}
          </DialogDescription>
        </div>

        <div className="px-5 py-4 overflow-y-auto bg-white flex-1 flex flex-col gap-4">
          
          {/* Combined Info Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl flex flex-col shadow-xs divide-y divide-slate-100">
             {/* Vehicle Row */}
             <div className="p-3 px-4 flex items-center gap-3">
               <div className="bg-white p-2.5 rounded-full border border-slate-200 shadow-xs shrink-0">
                 <CarIcon className="h-4 w-4 text-slate-500" />
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="font-black text-slate-800 text-sm leading-none truncate uppercase">{vehicleLicensePlate}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{vehicleTitle}</p>
               </div>
             </div>
             
             {/* Customer Row */}
             <div className="p-3 px-4 flex items-center gap-3">
               <div className="bg-white p-2.5 rounded-full border border-slate-200 shadow-xs shrink-0">
                 <User className="h-4 w-4 text-slate-400" />
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="font-bold text-slate-800 text-sm truncate">{service?.customerName || vehicle?.ownerName || "Cliente"}</p>
                 <p className="text-[10px] font-bold text-slate-400 mt-1 truncate tracking-wider">{service?.customerPhone || vehicle?.ownerPhone || "Sin teléfono"}</p>
               </div>
             </div>
          </div>
          
          {/* Signature Area */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 relative overflow-hidden h-[190px] touch-none shadow-inner group transition-colors focus-within:border-primary/50 focus-within:bg-white shrink-0">
             <div className="absolute top-3 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none group-focus-within:text-primary/50 transition-colors">Área de firma</div>
             <SignatureCanvas
                ref={sigCanvas}
                penColor="#000"
                canvasProps={{ className: "w-full h-full cursor-crosshair" }}
             />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3 mt-auto">
          <Button variant="outline" onClick={handleClear} className="w-1/3 rounded-xl h-12 shadow-xs bg-white hover:bg-slate-50 text-slate-600 font-bold">
            <Eraser className="mr-2 h-4 w-4 text-slate-400" /> Limpiar
          </Button>
          <Button onClick={handleSave} className={`w-2/3 rounded-xl h-12 text-white font-black shadow-md transition-all active:scale-[0.98] ${isReception ? 'bg-primary hover:bg-primary/90' : 'bg-green-600 hover:bg-green-700'}`}>
            <Save className="mr-2 h-4 w-4" /> Autorizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
    
    getPublicServiceData(publicId).catch((e: any) => console.warn("auto-repair failed:", e));

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

  useEffect(() => {
    if (!service) return;
    const status = (service.status || "").toLowerCase();
    
    // Automatically popup signature if missing based on status
    if (status === "en taller" && !service.customerSignatureReception) {
       setSignatureType("reception");
       setIsSigning(true);
    } else if (status === "entregado" && !service.customerSignatureDelivery) {
       setSignatureType("delivery");
       setIsSigning(true);
    }
  }, [service?.status, service?.customerSignatureReception, service?.customerSignatureDelivery]);

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

      <AutoSignatureModal
        open={isSigning}
        onOpenChange={(isOpen) => !isOpen && setIsSigning(false)}
        onSave={handleSaveSignature}
        type={signatureType}
        service={service}
        vehicle={vehicle}
      />

      <AppointmentScheduler
        open={isScheduling}
        onOpenChange={setIsScheduling}
        onConfirm={handleScheduleAppointment}
      />

      <TicketPreviewModal
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        service={service as any}
        vehicle={vehicle as any}
        workshopInfo={workshopInfo}
        isPublicView={true}
      />
    </>
  );
}
