// src/components/shared/ServiceSheetContent.tsx

"use client";

import type {
  Vehicle,
  ServiceRecord,
  SafetyInspection,
  SafetyCheckValue,
} from "@/types";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import React, { useMemo, useState, useEffect } from "react";
import {
  cn,
  formatCurrency,
  capitalizeWords,
  formatNumber,
  normalizeDataUrl,
} from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Car as CarIcon,
  CalendarCheck,
  CheckCircle,
  Ban,
  Signature,
  Loader2,
  Receipt,
  FileJson,
  AlertTriangle,
  UploadCloud,
  X,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cancelAppointmentAction } from "@/app/(public)/s/actions";
import { useToast } from "@/hooks/use-toast";
import { parseDate } from "@/lib/forms";
import {
  GARANTIA_CONDICIONES_TEXT,
  INGRESO_CONDICIONES_TEXT,
} from "@/lib/constants/legal-text";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { defaultTicketSettings } from "@/lib/constants/app";

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

const coerceDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isValid(v) ? v : null;
  if (typeof (v as any)?.toDate === "function") {
    const d = (v as any).toDate();
    return isValid(d) ? d : null;
  }
  if (typeof v === "number") {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isValid(d) ? d : null;
  }
  if (typeof v === "string") {
    const isoTry = parseISO(v);
    if (isValid(isoTry)) return isoTry;
    const generic = new Date(v);
    if (isValid(generic)) return generic;
  }
  return null;
};

const SheetHeader = React.memo(
  ({ service, workshopInfo }: { service: ServiceRecord; workshopInfo: any }) => {
    const creationDate = coerceDate(service.serviceDate) || new Date();
    const formattedCreationDate = isValid(creationDate)
      ? format(creationDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
      : "N/A";

    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative w-[180px] h-[60px]">
          {workshopInfo?.logoUrl ? (
            <Image
              src={workshopInfo.logoUrl}
              alt={`${workshopInfo.name} Logo`}
              fill
              style={{ objectFit: "contain", objectPosition: "left" }}
              sizes="180px"
              priority
            />
          ) : (
            <div className="text-2xl font-black text-slate-800 tracking-tighter">RANORO</div>
          )}
        </div>
        <div className="text-left sm:text-right bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-100 flex flex-col items-start sm:items-end">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-0.5">Orden de Servicio</p>
          <p className="font-black text-xl text-slate-800 leading-none">
            {service.folio || service.id?.slice(-8).toUpperCase()}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            {formattedCreationDate}
          </p>
        </div>
      </div>
    );
  }
);
SheetHeader.displayName = "SheetHeader";

const extractPlate = (s?: string | null) => {
  const t = (s ?? "").trim();
  if (!t) return null;
  const m = t.toUpperCase().match(/([A-Z0-9-]{5,10})$/);
  return m?.[1] ?? null;
};

const splitIdentifier = (identifier?: string) => {
  const plate = extractPlate(identifier);
  if (!identifier || !plate) return { title: identifier?.trim() ?? "", plate: null as string | null };
  const title = identifier.replace(new RegExp(`${plate}$`, "i"), "").trim();
  return { title, plate };
};

const ClientInfo = React.memo(
  ({
    service,
    vehicle,
  }: {
    service: ServiceRecord;
    vehicle?: Vehicle | null;
  }) => {
    const customerName = capitalizeWords(pickFirstText(service.customerName, (vehicle as any)?.ownerName, (vehicle as any)?.customerName) ?? "");
    const customerPhone = pickFirstText(service.customerPhone, (service as any).phone, (service as any).telefono, (vehicle as any)?.ownerPhone, (vehicle as any)?.phone, (vehicle as any)?.telefono) ?? "Teléfono no disponible";

    const idSplit = splitIdentifier(service.vehicleIdentifier);

    // placa: primero la del vehículo, si viene “rara” la parseamos, si no usamos la del identifier
    const rawVehiclePlate = pickFirstText((vehicle as any)?.licensePlate, (vehicle as any)?.plates, (vehicle as any)?.placas);
    const plateFromVehicle = extractPlate(rawVehiclePlate) ?? rawVehiclePlate ?? null;
    const vehicleLicensePlate = plateFromVehicle ?? idSplit.plate ?? "N/A";

    // título: intenta make/model/year; si viene vacío, usa el identifier (sin placa) o “Vehículo no asignado”
    const make = pickFirstText((vehicle as any)?.make, (vehicle as any)?.brand, (vehicle as any)?.marca) ?? "";
    const model = pickFirstText((vehicle as any)?.model, (vehicle as any)?.subModel, (vehicle as any)?.modelo, (vehicle as any)?.version) ?? "";
    const year = pickFirstText(String((vehicle as any)?.year ?? ""), String((vehicle as any)?.anio ?? ""), String((vehicle as any)?.año ?? "")) ?? "";

    const composedTitle = `${make} ${model}`.trim();
    const vehicleTitle =
      (composedTitle ? `${composedTitle}${year ? ` (${year})` : ""}` : "") ||
      idSplit.title ||
      "Vehículo no asignado";

    const mileageOk = typeof service.mileage === "number" && isFinite(service.mileage);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-start gap-4 transition-all hover:shadow-md">
          <div className="bg-slate-50 p-3 rounded-full text-slate-400 shrink-0 border border-slate-100">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cliente</p>
            <p className="font-bold text-slate-800 text-lg leading-tight">{customerName || "Cliente"}</p>
            <p className="text-sm text-slate-500 mt-1">
              {customerPhone !== "Teléfono no disponible" ? (
                <a className="hover:text-red-600 transition-colors" href={`tel:${customerPhone.replace(/\D/g, "")}`}>
                  {customerPhone}
                </a>
              ) : (
                customerPhone
              )}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-start gap-4 transition-all hover:shadow-md">
          <div className="bg-slate-50 p-3 rounded-full text-slate-400 shrink-0 border border-slate-100">
            <CarIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-0.5">Vehículo</p>
            <p className="font-bold text-slate-800 text-lg leading-tight">{vehicleTitle}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
               <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-600">{vehicleLicensePlate !== "N/A" ? vehicleLicensePlate : "Sin Placas"}</Badge>
               {(vehicle as any)?.color && <span className="text-xs text-slate-500">• {(vehicle as any).color}</span>}
               {mileageOk && <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">{formatNumber(service.mileage!)} km</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
ClientInfo.displayName = "ClientInfo";

const StatusCard = React.memo(
  ({
    service,
    isConfirming,
    onConfirmClick,
    onCancelAppointment,
  }: {
    service: ServiceRecord;
    isConfirming?: boolean;
    onConfirmClick?: () => void;
    onCancelAppointment: () => void;
  }) => {
    const status = (service.status || "").toLowerCase();
    const appointmentStatus = service.appointmentStatus;
    const appointmentDate = coerceDate(service.appointmentDateTime);
    const receptionDate = parseDate(service.receptionDateTime);
    const deliveryDate = parseDate(service.deliveryDateTime);

    const formattedAppointmentDate =
      appointmentDate && isValid(appointmentDate)
        ? format(
            appointmentDate,
            "EEEE dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'",
            { locale: es }
          )
        : "Fecha y hora por confirmar";
    const formattedReceptionDate =
      receptionDate && isValid(receptionDate)
        ? format(receptionDate, "dd MMMM, yyyy, HH:mm 'hrs'", { locale: es })
        : "Fecha no registrada";
    const formattedDeliveryDate =
      deliveryDate && isValid(deliveryDate)
        ? format(deliveryDate, "dd MMMM, yyyy, HH:mm 'hrs'", { locale: es })
        : "Fecha no registrada";

    const isAppointmentPending =
      status === "agendado" &&
      (appointmentStatus === "Sin Confirmar" ||
        service.subStatus === "Sin Confirmar");

    const statusInfo = useMemo(() => {
      if (status === "cancelado" || appointmentStatus === "Cancelada")
        return {
          title: "CANCELADO",
          description: "Este servicio o cita ha sido cancelado.",
          badge: { text: "Cancelado", variant: "destructive" },
          cardClass: "bg-red-50 border-red-200",
          titleClass: "text-red-800",
          descClass: "text-red-700",
        };

      if (status === "agendado") {
        if (
          appointmentStatus === "Confirmada" ||
          service.subStatus === "Confirmada"
        )
          return {
            title: "CITA AGENDADA",
            description: formattedAppointmentDate,
            badge: { text: "Confirmada", variant: "success" },
            cardClass: "bg-green-50 border-green-200",
            titleClass: "text-green-800",
            descClass: "text-green-700",
          };
        if (
          appointmentStatus === "Sin Confirmar" ||
          service.subStatus === "Sin Confirmar"
        )
          return {
            title: "CITA PENDIENTE DE CONFIRMACIÓN",
            description: formattedAppointmentDate,
            badge: { text: "Pendiente", variant: "waiting" },
            cardClass: "bg-yellow-50 border-yellow-200",
            titleClass: "text-yellow-800",
            descClass: "text-yellow-700",
          };
        return {
          title: "CITA AGENDADA",
          description: formattedAppointmentDate,
          badge: { text: "Agendado", variant: "default" },
          cardClass: "bg-blue-50 border-blue-200",
          titleClass: "text-blue-800",
          descClass: "text-blue-700",
        };
      }

      if (status === "en taller") {
        const subStatus = service.subStatus;
        let badgeVariant: any = "secondary";
        if (subStatus === "Ingresado") badgeVariant = "destructive";
        if (subStatus === "En Espera de Refacciones") badgeVariant = "waiting";
        if (subStatus === "Reparando") badgeVariant = "blue";
        if (subStatus === "Completado") badgeVariant = "success";
        return {
          title: "ORDEN DE SERVICIO",
          description: `Ingresado: ${formattedReceptionDate}`,
          badge: { text: subStatus || "En Taller", variant: badgeVariant },
          cardClass: "bg-blue-50 border-blue-200",
          titleClass: "text-blue-800",
          descClass: "text-blue-700",
        };
      }

      if (status === "entregado")
        return {
          title: "ORDEN DE SERVICIO",
          description: `Ingresado: ${formattedReceptionDate} | Entregado: ${formattedDeliveryDate}`,
          badge: { text: "Entregado", variant: "success" },
          cardClass: "bg-green-50 border-green-200",
          titleClass: "text-green-800",
          descClass: "text-green-700",
        };

      return {
        title: "COTIZACIÓN DE SERVICIO",
        description: null,
        badge: null,
        cardClass: "bg-muted/50",
        titleClass: "text-foreground",
        descClass: "text-muted-foreground",
      };
    }, [
      status,
      appointmentStatus,
      service.subStatus,
      formattedAppointmentDate,
      formattedReceptionDate,
      formattedDeliveryDate,
    ]);

    const shouldShowNextService =
      service.status === "Entregado" &&
      service.nextServiceInfo?.date &&
      isValid(parseDate(service.nextServiceInfo.date)!);

    return (
      <>
        <div className={cn("rounded-2xl p-6 md:p-8 text-center shadow-xs border overflow-hidden relative", statusInfo.cardClass)}>
          {/* Subtle gradient styling */}
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-current to-transparent opacity-20" />
          
          <div className="relative z-10">
             <h2 className={cn("text-sm md:text-base font-black tracking-widest uppercase mb-1", statusInfo.titleClass)}>
               {statusInfo.title}
             </h2>
             {statusInfo.description && (
               <p className={cn("font-medium text-sm md:text-base", statusInfo.descClass)}>
                 {statusInfo.description}
               </p>
             )}
             {statusInfo.badge && (
               <div className="mt-4 inline-block">
                 <Badge variant={statusInfo.badge.variant as any} className="text-sm px-4 py-1.5 shadow-xs">
                   {statusInfo.badge.text}
                 </Badge>
               </div>
             )}
          </div>
        </div>
        {isAppointmentPending && onConfirmClick && (
          <div className="flex justify-center items-center gap-4 flex-wrap mt-6">
            <ConfirmDialog
              triggerButton={
                <Button variant="destructive" disabled={isConfirming}>
                  <Ban className="mr-2 h-4 w-4" />
                  Cancelar Cita
                </Button>
              }
              title="¿Estás seguro de cancelar esta cita?"
              description="Esta acción notificará al taller sobre la cancelación. Puedes volver a agendar más tarde."
              onConfirm={onCancelAppointment}
              isLoading={isConfirming}
            />
            <Button
              onClick={onConfirmClick}
              size="lg"
              disabled={isConfirming}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {isConfirming ? "Confirmando..." : "Confirmar mi Cita"}
            </Button>
          </div>
        )}
        {shouldShowNextService && (
          <div className="mt-4 bg-linear-to-r from-red-50 to-white border border-red-100 rounded-2xl p-5 text-center shadow-xs relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 bg-red-500 h-full" />
             <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
               <CalendarCheck className="h-5 w-5" />
               <h3 className="font-bold tracking-widest text-sm md:text-base uppercase">Próximo Servicio</h3>
             </div>
             <p className="text-slate-700 font-semibold mt-1">
                Fecha Sugerida:{" "}
                {format(parseDate(service.nextServiceInfo!.date)!, "dd 'de' MMMM 'de' yyyy", {
                  locale: es,
                })}
                {service.nextServiceInfo!.mileage && typeof service.nextServiceInfo!.mileage === "number" && isFinite(service.nextServiceInfo!.mileage) && (
                  <span className="text-slate-500 ml-1">/ a los {formatNumber(service.nextServiceInfo!.mileage)} km</span>
                )}
             </p>
          </div>
        )}
      </>
    );
  }
);
StatusCard.displayName = "StatusCard";

const SheetFooter = React.memo(
  ({
    workshopInfo,
    advisorName,
    advisorSignature,
  }: {
    workshopInfo: any;
    advisorName?: string | null;
    advisorSignature?: string | null;
  }) => (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-xs border border-slate-100">
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-40 h-16 shrink-0">
              {advisorSignature && (
                <Image
                  src={normalizeDataUrl(advisorSignature)}
                  alt="Firma del asesor"
                  fill
                  style={{ objectFit: "contain" }}
                  sizes="160px"
                />
              )}
            </div>
            <div className="mt-2">
              <p className="font-bold text-sm leading-tight">
                {capitalizeWords(advisorName || "Asesor de Servicio")}
              </p>
              <p className="text-xs text-muted-foreground">Asesor de Servicio</p>
            </div>
          </div>
          <div className="text-center md:text-left">
            <p className="font-semibold text-lg">
              {workshopInfo.footerLine1 || "¡Gracias por su preferencia!"}
            </p>
            <p className="text-muted-foreground">
              {workshopInfo.footerLine2 ||
                "Para dudas o aclaraciones, no dude en contactarnos."}
            </p>
            {workshopInfo?.phone && (
              <a
                href={`https://wa.me/${(workshopInfo.phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="mt-3 bg-white text-slate-700 hover:bg-slate-50 border-slate-200 rounded-full shadow-xs"
                >
                  <Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2" />
                  Contactar Asesor
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xs border border-slate-100">
        <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <a
              href={workshopInfo.googleMapsUrl || "https://share.google/7ow83ayhfb2iIOKUX"}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-muted"
            >
              <Icon icon="logos:google-maps" className="h-6 w-6" />
            </a>
            {workshopInfo?.phone && (
              <a
                href={`https://wa.me/${(workshopInfo.phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted"
              >
                <Icon icon="logos:whatsapp-icon" className="h-6 w-6" />
              </a>
            )}
            <a
              href="https://www.facebook.com/ranoromx"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-muted"
            >
              <Icon icon="logos:facebook" className="h-6 w-6" />
            </a>
            <a
              href="https://www.instagram.com/ranoromx"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-muted"
            >
              <Icon icon="skill-icons:instagram" className="h-6 w-6" />
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/legal/terminos" target="_blank" className="font-medium text-slate-500 hover:text-slate-800 transition-colors">
              Términos
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/legal/privacidad" target="_blank" className="font-medium text-slate-500 hover:text-slate-800 transition-colors">
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
);
SheetFooter.displayName = "SheetFooter";

const SignatureActionCard = ({ onSignClick }: { onSignClick: () => void }) => (
  <div className="bg-linear-to-r from-red-600 to-red-500 rounded-2xl shadow-md border-0 overflow-hidden mb-8 relative">
     <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Signature className="w-32 h-32 text-white transform rotate-12" />
     </div>
    <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
      <div>
         <h4 className="text-white font-black text-lg mb-1">Autorización Pendiente</h4>
         <p className="text-red-50 font-medium text-sm sm:text-base leading-snug max-w-md">
           Tu vehículo ya está en taller. Por favor autoriza la orden de trabajo para que nuestros mecánicos puedan comenzar de inmediato.
         </p>
      </div>
      <Button onClick={onSignClick} variant="secondary" size="lg" className="w-full sm:w-auto shrink-0 bg-white text-red-600 hover:bg-slate-50 rounded-xl font-bold shadow-xs">
        <Signature className="mr-2 h-5 w-5" />
        Firmar y Autorizar
      </Button>
    </div>
  </div>
);

interface ServiceSheetContentProps {
  service: ServiceRecord;
  onScheduleClick?: () => void;
  onConfirmClick?: () => void;
  onCancelAppointment: () => void;
  onShowTicketClick?: () => void;
  isConfirming?: boolean;
  onSignClick?: (type: "reception" | "delivery") => void;
  isSigning?: boolean;
  activeTab?: string;
  vehicle?: Vehicle | null;
}

export const ServiceSheetContent = React.forwardRef<
  HTMLDivElement,
  ServiceSheetContentProps
>(
  (
    {
      service,
      onScheduleClick,
      onConfirmClick,
      isConfirming,
      onSignClick,
      isSigning,
      onShowTicketClick,
      vehicle,
      onCancelAppointment,
    },
    ref
  ) => {
    const { toast } = useToast();
    const [currentActiveTab, setActiveTab] = useState("order");
    const [branding, setBranding] = useState<any>(defaultTicketSettings);

    useEffect(() => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('workshopTicketInfo') : null;
      if (stored) {
        try { setBranding((prev: any) => ({ ...prev, ...JSON.parse(stored) })); }
        catch (e) { console.error("Could not parse workshop info from storage", e); }
      }
    }, []);
    
    const status = (service.status || "").toLowerCase();
    const showSignatureAction =
      onSignClick &&
      ((status === "en taller" && !service.customerSignatureReception) ||
        (status === "entregado" && !service.customerSignatureDelivery));
    const signatureActionType =
      status === "entregado" ? "delivery" : "reception";

    const handleCancelAppointment = async () => {
      try {
        const result = await cancelAppointmentAction(service.id);
        if (result.success) {
          toast({
            title: "Cita Cancelada",
            description: "Tu cita ha sido cancelada exitosamente.",
          });
        } else {
          throw new Error(result.error);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message ?? "No se pudo cancelar la cita.",
          variant: "destructive",
        });
      }
    };
    
    const tabs = useMemo(() => {
      const availableTabs = [
        {
          value: "order",
          label: "Orden de Servicio",
          content: (
            <ServiceOrderTab
              service={service}
              vehicle={vehicle}
              onSignClick={onSignClick}
              isSigning={isSigning}
              onShowTicketClick={onShowTicketClick}
            />
          ),
        },
      ];
      if (
        service.safetyInspection &&
        Object.values(service.safetyInspection).some(
          (v: any) => v && v.status && v.status !== "na"
        )
      ) {
        availableTabs.push({
          value: "checklist",
          label: "Revisión de Seguridad",
          content: <SafetyChecklistDisplay inspection={Array.isArray(service.safetyInspection) ? service.safetyInspection : [service.safetyInspection]} />,
        });
      }
      if (
        service.photoReports &&
        service.photoReports.length > 0 &&
        service.photoReports.some((r: { photos?: any[] }) => (r?.photos?.length ?? 0) > 0)
      ) {
        availableTabs.push({
          value: "photoreport",
          label: "Reporte Fotográfico",
          content: <PhotoReportContent photoReports={service.photoReports} />,
        });
      }
      if (service.originalQuoteItems && service.originalQuoteItems.length > 0) {
        availableTabs.push({
          value: "quote",
          label: "Cotización Original",
          content: (
            <OriginalQuoteContent items={service.originalQuoteItems as any[]} />
          ),
        });
      }
      return availableTabs;
    }, [service, vehicle, onSignClick, isSigning, onShowTicketClick]);

    return (
      <div ref={ref} className="space-y-6">
        {showSignatureAction && (
          <SignatureActionCard
            onSignClick={() => onSignClick!(signatureActionType)}
          />
        )}
        <SheetHeader service={service} workshopInfo={branding} />
        <ClientInfo service={service} vehicle={vehicle ?? undefined} />
        <StatusCard
          service={service}
          isConfirming={isConfirming}
          onConfirmClick={onConfirmClick}
          onCancelAppointment={handleCancelAppointment}
        />
        {status === "cotizacion" && onScheduleClick && (
          <div className="text-center mt-6">
            <Button onClick={onScheduleClick} size="lg" className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 shadow-md">
              <CalendarDays className="mr-2 h-5 w-5" />
              Agendar Cita Ahora
            </Button>
          </div>
        )}

        <div className="mt-10 overflow-visible">
          <Tabs value={currentActiveTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
               <TabsList className="bg-slate-200/50 p-1.5 rounded-full inline-flex max-w-full overflow-x-auto scrollbar-hide shadow-inner border border-slate-200/50">
                 {tabs.map((tab) => (
                   <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-5 py-2 text-sm font-semibold text-slate-500 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                     {tab.label}
                   </TabsTrigger>
                 ))}
               </TabsList>
            </div>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-0 outline-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <SheetFooter
          workshopInfo={branding}
          advisorName={service.serviceAdvisorName}
          advisorSignature={service.serviceAdvisorSignatureDataUrl}
        />
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";

function ServiceOrderTab({
  service,
  vehicle,
  onSignClick,
  isSigning,
  onShowTicketClick,
}: {
  service: ServiceRecord;
  vehicle?: Vehicle | null;
  onSignClick?: (type: "reception" | "delivery") => void;
  isSigning?: boolean;
  onShowTicketClick?: () => void;
}) {
  const [showBillingPolicies, setShowBillingPolicies] = useState(false);

  const items = useMemo(
    () =>
      (service?.serviceItems ?? []).map((it) => ({
        ...it,
        price: Number((it as any)?.sellingPrice) || 0,
      })),
    [service?.serviceItems]
  );
  const { subTotal, taxAmount, totalCost } = useMemo(() => {
    const total = items.reduce((acc, it: any) => acc + (it.price || 0), 0);
    const sub = total / (1 + 0.16);
    const tax = total - sub;
    return { subTotal: sub, taxAmount: tax, totalCost: total };
  }, [items]);

  const statusLower = (service.status || "").toLowerCase();
  const showReceptionCard = ["en taller", "entregado", "completado"].includes(
    statusLower
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
           <h3 className="font-bold text-slate-800 flex items-center gap-2">
             <Receipt className="w-5 h-5 text-slate-400" />
             Desglose de Trabajos
           </h3>
           <Badge variant="outline" className="bg-white font-medium text-slate-500">{items.length} {items.length === 1 ? 'Trabajo' : 'Trabajos'}</Badge>
        </div>
        <div className="p-0">
            {items.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {items.map((item: any, index: number) => (
                  <div key={item.id || index} className="p-6 transition-colors hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                        <div className="mt-2 text-sm text-slate-500 space-y-1">
                          <p className="font-medium text-slate-400 text-xs uppercase tracking-wider">Insumos y Refacciones:</p>
                          <ul className="list-disc list-inside">
                            {item.suppliesUsed.map((s: any, idx: number) => (
                               <li key={idx} className="marker:text-slate-300">{s.quantity}x {s.supplyName}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                       <p className="font-black text-xl text-slate-800">{formatCurrency(item.price ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6">
                 <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <FileJson className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-slate-500 font-medium">Aún no hay trabajos detallados.</p>
              </div>
            )}
          </div>
          <div className="bg-slate-50 px-6 py-5 border-t border-slate-100 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
            <div className="flex-1 w-full md:w-auto">
              <div className="space-y-1.5 text-sm w-full md:max-w-xs ml-auto md:ml-0">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>IVA (16%):</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(taxAmount)}</span>
                </div>
              </div>
            </div>
            <div className="text-right border-t border-slate-200 md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 w-full md:w-auto flex flex-col items-end">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</span>
               <span className="font-black text-3xl text-red-600 leading-none">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        {service.status === "Entregado" && (
          <div className="bg-white border-t border-slate-100 px-6 py-8 md:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-bold text-lg text-slate-800 flex items-center justify-center md:justify-start gap-2 mb-1">
                  <Receipt className="h-5 w-5 text-primary" />
                  Comprobantes y Facturación
                </h4>
                <p className="text-sm text-slate-500">
                  Consulta tu ticket detallado o genera tu factura electrónica (CFDI).
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                {onShowTicketClick && (
                  <Button onClick={onShowTicketClick} variant="outline" className="w-full sm:w-auto h-12 rounded-xl shadow-xs border-slate-200 hover:bg-slate-50 text-slate-700 font-bold">
                    <Receipt className="mr-2 h-4 w-4 text-slate-400" />
                    Ver Ticket
                  </Button>
                )}
                <Button 
                  onClick={() => setShowBillingPolicies(!showBillingPolicies)} 
                  className={cn("w-full sm:w-auto h-12 rounded-xl shadow-md font-bold transition-all", showBillingPolicies ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-primary text-white hover:bg-primary/90")}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  {showBillingPolicies ? "Ocultar Facturación" : "Generar Factura"}
                </Button>
              </div>
            </div>

            {/* Collapsible Policy Area */}
            {showBillingPolicies && (
              <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-100 mb-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="text-sm leading-relaxed text-amber-900">
                      <p className="font-bold mb-1 tracking-wide uppercase text-[10px] text-amber-600">Políticas de Facturación</p>
                      <p className="mb-2">
                        Tienes <strong>48 horas</strong> posteriores a la emisión de este ticket para facturar. Si es el último día del mes, debe generarse antes de las <strong>20:00 hrs</strong>.
                      </p>
                      <p>
                        Toda cancelación o re-emisión por errores en los datos conlleva un costo administrativo de <strong>$250.00 MXN</strong>.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 rounded-2xl shadow-md bg-green-600 hover:bg-green-700 text-white font-bold transition-all active:scale-[0.98]">
                    <Link href={`/facturar?folio=${service.folio || service.id}&total=${totalCost}`} target="_blank">
                      Ir al Portal de Facturación
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-6",
          service.status === "Entregado" && "md:grid-cols-2"
        )}
      >
        {showReceptionCard && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-100 p-6 md:p-8 flex flex-col">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Ingreso del Vehículo al Taller</h3>
            <div className="space-y-6 flex-1">
              <ReceptionDetails service={service} />
              <div className="border-t border-slate-100 pt-6">
                <h4 className="font-semibold text-slate-700 mb-2">Condiciones de Ingreso</h4>
                <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                  {INGRESO_CONDICIONES_TEXT}
                </p>
                <div className="mt-8 text-center bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Firma de Autorización (Recepción)</p>
                    <div className="flex items-center justify-center min-h-[80px]">
                      {service.customerSignatureReception ? (
                        <Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma de recepción" width={180} height={90} style={{objectFit:"contain"}} unoptimized />
                      ) : onSignClick ? (
                        <Button onClick={() => onSignClick('reception')} disabled={isSigning} className="bg-primary hover:bg-primary/90 text-white shadow-xs rounded-xl font-medium px-8">{isSigning ? 'Cargando...' : 'Firmar Recepción'}</Button>
                      ) : (<p className="text-sm font-medium text-slate-400">Firma Pendiente</p>)}
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {service.status === 'Entregado' && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-100 p-6 md:p-8 flex flex-col">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Salida y Conformidad</h3>
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Garantía</h4>
                <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                  {GARANTIA_CONDICIONES_TEXT}
                </p>
              </div>
              <div className="mt-8 text-center bg-slate-50 rounded-2xl p-6 border border-slate-100 mt-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Firma de Conformidad (Entrega)</p>
                  <div className="flex items-center justify-center min-h-[80px]">
                    {service.customerSignatureDelivery ? (
                      <Image src={normalizeDataUrl(service.customerSignatureDelivery)} alt="Firma de entrega" width={180} height={90} style={{objectFit:"contain"}} unoptimized />
                    ) : onSignClick ? (
                      <Button onClick={() => onSignClick('delivery')} disabled={isSigning} className="bg-primary hover:bg-primary/90 text-white shadow-xs rounded-xl font-medium px-8">{isSigning ? 'Cargando...' : 'Firmar Conformidad'}</Button>
                    ) : (<p className="text-sm font-medium text-slate-400">Firma Pendiente</p>)}
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceptionDetails({ service }: { service: ServiceRecord }) {
  const fuelLevelMap: Record<string, number> = {
    Vacío: 0,
    "1/8": 12.5,
    "1/4": 25,
    "3/8": 37.5,
    "1/2": 50,
    "5/8": 62.5,
    "3/4": 75,
    "7/8": 87.5,
    Lleno: 100,
  };
  const fuelPercentage = service.fuelLevel ? fuelLevelMap[service.fuelLevel] ?? 0 : 0;
  const fuelColor =
    fuelPercentage <= 25
      ? "bg-red-500"
      : fuelPercentage <= 50
      ? "bg-orange-400"
      : fuelPercentage <= 87.5
      ? "bg-yellow-400"
      : "bg-green-500";
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">Condiciones del Vehículo</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {service.vehicleConditions || "No especificado"}
          </p>
        </div>
        <div>
          <h4 className="font-semibold">Pertenencias del Cliente</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {service.customerItems || "No especificado"}
          </p>
        </div>
      </div>
      <div>
        <h4 className="font-semibold">Nivel de Combustible</h4>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300 mt-2">
          <div className={cn("h-full transition-all", fuelColor)} style={{ width: `${fuelPercentage}%` }} />
        </div>
        <p className="text-center text-xs mt-1">{service.fuelLevel || "N/A"}</p>
      </div>
    </>
  );
}


type SafetyInspectionRecord = SafetyInspection & {
  inspectionNotes?: string;
  technicianSignature?: string;
};

function SafetyChecklistDisplay({ inspection }: { inspection: SafetyInspection[] }) {
  const inspectionRecord = (inspection?.[0] ?? {}) as SafetyInspectionRecord;

  const inspectionGroups = [
    {
      title: "LUCES",
      items: [
        { name: "luces_altas_bajas_niebla", label: "ALTAS, BAJAS Y NIEBLA" },
        { name: "luces_cuartos", label: "CUARTOS" },
        { name: "luces_direccionales", label: "DIRECCIONALES" },
        { name: "luces_frenos_reversa", label: "FRENOS Y REVERSA" },
        { name: "luces_interiores", label: "INTERIORES" },
      ],
    },
    {
      title: "NIVELES Y FUGAS",
      items: [
        { name: "fugas_refrigerante", label: "REFRIGERANTE" },
        { name: "fugas_limpiaparabrisas", label: "LIMPIAPARABRISAS" },
        { name: "fugas_frenos_embrague", label: "FRENOS Y EMBRAGUE" },
        { name: "fugas_transmision", label: "TRANSMISIÓN" },
        { name: "fugas_direccion_hidraulica", label: "DIRECCIÓN HIDRÁULICA" },
      ],
    },
    {
      title: "CARROCERÍA",
      items: [
        { name: "carroceria_cristales_espejos", label: "CRISTALES/ESPEJOS" },
        { name: "carroceria_puertas_cofre", label: "PUERTAS/COFRE/CAJUELA" },
        { name: "carroceria_asientos_tablero", label: "ASIENTOS/TABLERO" },
        { name: "carroceria_plumas", label: "PLUMAS LIMPIAPARABRISAS" },
      ],
    },
    {
      title: "SUSPENSIÓN",
      items: [
        { name: "suspension_rotulas", label: "RÓTULAS" },
        { name: "suspension_amortiguadores", label: "AMORTIGUADORES" },
        { name: "suspension_caja_direccion", label: "CAJA DE DIRECCIÓN" },
        { name: "suspension_terminales", label: "TERMINALES" },
      ],
    },
    {
      title: "LLANTAS",
      items: [
        { name: "llantas_delanteras_traseras", label: "DELANTERAS/TRASERAS" },
        { name: "llantas_refaccion", label: "REFACCIÓN" },
      ],
    },
    {
      title: "FRENOS",
      items: [
        { name: "frenos_discos_delanteros", label: "FRENOS DELANTEROS" },
        { name: "frenos_discos_traseros", label: "FRENOS TRASEROS" },
      ],
    },
    {
      title: "OTROS",
      items: [
        { name: "otros_tuberia_escape", label: "SISTEMA DE ESCAPE" },
        { name: "otros_soportes_motor", label: "SOPORTES DE MOTOR" },
        { name: "otros_claxon", label: "CLAXON" },
        { name: "otros_inspeccion_sdb", label: "INSPECCIÓN SDB" },
      ],
    },
  ];

  const StatusIndicator = ({ status }: { status?: SafetyCheckValue["status"] }) => {
    const statusInfo = {
      ok: { label: "Bien", color: "bg-green-500", textColor: "text-green-700" },
      atencion: { label: "Atención", color: "bg-yellow-400", textColor: "text-yellow-700" },
      inmediata: { label: "Inmediata", color: "bg-red-500", textColor: "text-red-700" },
      na: { label: "N/A", color: "bg-gray-300", textColor: "text-gray-500" },
    };
    const currentStatus = statusInfo[status || "na"];
    return (
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${currentStatus.color}`} />
        <span className={cn("text-xs font-semibold", currentStatus.textColor)}>{currentStatus.label}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-5">
         <h3 className="font-bold text-slate-800 flex items-center gap-2">
           <CheckCircle className="w-5 h-5 text-slate-400" />
           Revisión de Puntos de Seguridad
         </h3>
      </div>
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {inspectionGroups.map((group) => (
            <div key={group.title}>
              <h4 className="font-bold text-base mb-2 border-b-2 border-primary pb-1">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const keyName = item.name as keyof Omit<SafetyInspection, "inspectionNotes" | "technicianSignature">;
                  const checkItem = (inspectionRecord as any)[keyName];
                  return (
                    <div key={item.name} className="py-2 border-b border-dashed last:border-none">
                      <div className="flex justify-between items-center text-sm">
                        <span className="pr-4">{item.label}</span>
                        <StatusIndicator status={checkItem?.status} />
                      </div>
                      {checkItem?.notes && (
                        <p className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-slate-200">
                          Nota: {checkItem.notes}
                        </p>
                      )}
                      {checkItem?.photos && checkItem.photos.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {checkItem.photos.map((p: string, i: number) => (
                            <div key={i} className="relative w-16 h-16 rounded border bg-slate-100">
                              <Image src={p} alt={`Foto ${i}`} fill style={{ objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-semibold">Observaciones Generales</h4>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {String(inspectionRecord.inspectionNotes ?? "Sin observaciones.")}
          </p>
        </div>
        <div>
          <h4 className="font-semibold">Firma del Técnico</h4>
          <div className="mt-1 p-2 h-24 border rounded-md bg-muted/50 flex items-center justify-center">
            {inspectionRecord.technicianSignature ? (
              <Image
                src={normalizeDataUrl(String(inspectionRecord.technicianSignature))}
                alt="Firma Técnico"
                width={200}
                height={80}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <span className="text-xs text-muted-foreground">Sin firma</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoReportContent({ photoReports }: { photoReports: any[] }) {
  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-5">
         <h3 className="font-bold text-slate-800 flex items-center gap-2">
           <CheckCircle className="w-5 h-5 text-slate-400" />
           Reporte Fotográfico
         </h3>
      </div>
      <div className="p-6 md:p-8 space-y-4">
        {photoReports.map((report) => (
          <div key={report.id}>
            <p className="font-semibold">{report.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {report.photos.map((photo: string, i: number) => (
                <div key={i} className="relative aspect-square bg-muted rounded">
                  <Image src={photo} alt="Foto de servicio" fill style={{ objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OriginalQuoteContent({ items }: { items: any[] }) {
  const total = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
       <div className="bg-slate-50 border-b border-slate-100 px-6 py-5">
          <h3 className="font-bold text-slate-800">Conceptos de la Cotización Original</h3>
       </div>
      <div className="p-0">
        <div className="p-6 md:p-8 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm p-4 bg-slate-50 border border-slate-100 rounded-xl transition-all">
              <span className="font-semibold text-slate-700">{item.name}</span>
              <span className="font-bold text-slate-800">{formatCurrency(item.price)}</span>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border-t border-slate-100 px-6 md:px-8 py-5 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Original:</span>
          <span className="font-black text-2xl text-slate-800">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
