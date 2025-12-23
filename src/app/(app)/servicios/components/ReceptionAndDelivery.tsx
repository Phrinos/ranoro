// src/app/(app)/servicios/components/ReceptionAndDelivery.tsx
"use client";

import type { Vehicle, ServiceRecord, SafetyInspection, SafetyCheckValue } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState, useEffect } from 'react';
import { cn, formatCurrency, capitalizeWords, formatNumber, normalizeDataUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Car as CarIcon, CalendarCheck, CheckCircle, Ban, Signature, Loader2, CalendarDays, Receipt, FileJson } from 'lucide-react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cancelAppointmentAction } from '@/app/(public)/s/actions';
import { useToast } from '@/hooks/use-toast';
import { parseDate } from '@/lib/forms';
import { GARANTIA_CONDICIONES_TEXT, INGRESO_CONDICIONES_TEXT } from "@/lib/constants/legal-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Branding/Ticket settings locales (lee de localStorage 'workshopTicketInfo') */
const defaultTicketSettings: any = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
  footerLine1: "¡Gracias por su preferencia!",
  footerLine2: "Para dudas o aclaraciones, no dude en contactarnos.",
  fixedFooterText: "© 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
  googleMapsUrl: "https://share.google/7ow83ayhfb2iIOKUX"
};

const coerceDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isValid(v) ? v : null;
  if (typeof (v as any)?.toDate === 'function') {
    const d = (v as any).toDate();
    return isValid(d) ? d : null;
  }
  if (typeof v === 'number') {
    const d = new Date(v > 1e12 ? v : v * 1000);
    return isValid(d) ? d : null;
  }
  if (typeof v === 'string') {
    const isoTry = parseISO(v);
    if (isValid(isoTry)) return isoTry;
    const generic = new Date(v);
    if (isValid(generic)) return generic;
  }
  return null;
};

const pickFirstText = (...vals: any[]): string => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const pickYear = (...vals: any[]) => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (/^\d{4}$/.test(s)) return s;
  }
  return "";
};

const normalizePlate = (raw: string) =>
  raw
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");

const isLikelyPlate = (raw: string) => {
  const p = normalizePlate(raw);
  // 5–10 chars, al menos una letra y un número (evita "2020")
  return p.length >= 5 && p.length <= 10 && /[A-Z]/.test(p) && /\d/.test(p);
};

const extractPlateFromText = (text: string) => {
  const upper = String(text || "").toUpperCase();
  const tokens = upper.match(/[A-Z0-9-]{5,12}/g) ?? [];
  const candidate = tokens.find(t => /[A-Z]/.test(t) && /\d/.test(t) && t.length <= 10);
  return candidate ? normalizePlate(candidate) : "";
};

const stripPlateFromText = (text: string, plate: string) => {
  if (!text) return "";
  if (!plate) return text.trim();
  return text.replace(new RegExp(plate, "i"), "").replace(/\s{2,}/g, " ").trim();
};

const formatPhoneMx = (raw: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  const last10 = digits.length > 10 ? digits.slice(-10) : digits;
  if (last10.length !== 10) return raw; // deja tal cual si no es 10 dígitos
  return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
};

const toWhatsAppDigits = (raw: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  const last10 = digits.length > 10 ? digits.slice(-10) : digits;
  if (last10.length !== 10) return "";
  return `52${last10}`;
};

// ---------- Subcomponents ----------
const SheetHeader = React.memo(({ service, workshopInfo }: { service: ServiceRecord, workshopInfo: any }) => {
  const creationDate = coerceDate(service.serviceDate) || new Date();
  const formattedCreationDate = isValid(creationDate) ? format(creationDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A';

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="relative w-[150px] h-[50px] mb-4 sm:mb-0">
          {workshopInfo?.logoUrl && (
            <Image
              src={workshopInfo.logoUrl}
              alt={`${workshopInfo?.name ?? 'Taller'} Logo`}
              fill
              style={{ objectFit: 'contain' }}
              data-ai-hint="workshop logo"
              sizes="150px"
            />
          )}
        </div>
        <div className="text-left sm:text-right">
          <p className="font-bold text-lg">Folio: {service.folio || service.id}</p>
          <p className="text-sm text-muted-foreground">{formattedCreationDate}</p>
        </div>
      </CardHeader>
    </Card>
  );
});
SheetHeader.displayName = 'SheetHeader';

const ClientInfo = React.memo(({ service, vehicle }: { service: ServiceRecord, vehicle?: Vehicle | null }) => {
  const customerName = capitalizeWords(
    pickFirstText(
      service.customerName,
      (service as any).customer?.name,
      (service as any).customer?.fullName,
      vehicle?.ownerName
    )
  ) || "Cliente no registrado";

  const customerPhoneRaw = pickFirstText(
    service.customerPhone,
    (service as any).customer?.phone,
    (service as any).customer?.phoneNumber,
    (service as any).phone,
    vehicle?.ownerPhone
  );

  const customerPhone = customerPhoneRaw ? formatPhoneMx(customerPhoneRaw) : "Teléfono no disponible";
  const waDigits = customerPhoneRaw ? toWhatsAppDigits(customerPhoneRaw) : "";

  const make = pickFirstText(
    vehicle?.make,
    (service as any).vehicleMake,
    (service as any).vehicle?.make
  );

  const model = pickFirstText(
    vehicle?.model,
    (service as any).vehicleModel,
    (service as any).vehicle?.model
  );

  const year = pickYear(
    vehicle?.year,
    (service as any).vehicleYear,
    (service as any).vehicle?.year
  );

  const fromVehiclePlate = pickFirstText(vehicle?.licensePlate, (vehicle as any)?.plates);
  const safeVehiclePlate = fromVehiclePlate && isLikelyPlate(fromVehiclePlate) ? normalizePlate(fromVehiclePlate) : "";

  const fromServicePlate = pickFirstText(
    service.licensePlate,
    service.vehicleLicensePlate,
    (service as any).plates
  );
  const safeServicePlate = fromServicePlate && isLikelyPlate(fromServicePlate) ? normalizePlate(fromServicePlate) : "";

  const parsedPlate = extractPlateFromText(pickFirstText(service.vehicleIdentifier));
  const vehicleLicensePlate = safeVehiclePlate || safeServicePlate || parsedPlate || "";

  const titleParts = [make, model].filter(Boolean).join(" ").trim();
  const vehicleTitle =
    titleParts
      ? `${titleParts}${year ? ` (${year})` : ""}`
      : (pickFirstText(service.vehicleIdentifier)
          ? stripPlateFromText(pickFirstText(service.vehicleIdentifier), vehicleLicensePlate) || "Vehículo no asignado"
          : "Vehículo no asignado");

  const color = pickFirstText(vehicle?.color, service.vehicleColor);
  const vin = pickFirstText(vehicle?.vin, service?.vin);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <User className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-base">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <p className="font-semibold">{customerName}</p>

          <div className="text-sm text-muted-foreground flex items-center justify-between gap-3 flex-wrap">
            <span>{customerPhone}</span>
            {waDigits && (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="secondary" size="sm" className="h-8">
                  <Icon icon="logos:whatsapp-icon" className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            )}
          </div>

          {!!pickFirstText(service.customerEmail, (service as any).customer?.email) && (
            <p className="text-xs text-muted-foreground">
              {pickFirstText(service.customerEmail, (service as any).customer?.email)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 p-4">
          <CarIcon className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-base">Vehículo</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-1">
          <p className="font-semibold">{vehicleTitle}</p>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Placas:</span>{" "}
            {vehicleLicensePlate || "No registradas"}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
            {color && <span>Color: {color}</span>}
            {vin && <span>VIN: {vin}</span>}
            {!!service.mileage && <span>KM: {formatNumber(service.mileage)}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
ClientInfo.displayName = "ClientInfo";

const StatusCard = React.memo((
  { service, isConfirming, onConfirmClick, onCancelAppointment }: 
  { service: ServiceRecord, isConfirming?: boolean, onConfirmClick?: () => void, onCancelAppointment: () => void }
) => {
  const status = (service.status || '').toLowerCase();
  const appointmentStatus = service.appointmentStatus;
  const appointmentDate = coerceDate(service.appointmentDateTime);
  const receptionDate = parseDate(service.receptionDateTime);
  const deliveryDate = parseDate(service.deliveryDateTime);

  const formattedAppointmentDate = appointmentDate && isValid(appointmentDate)
    ? format(appointmentDate, "EEEE dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'", { locale: es })
    : 'Fecha y hora por confirmar';
  const formattedReceptionDate = receptionDate && isValid(receptionDate)
    ? format(receptionDate, "dd MMMM, yyyy, HH:mm 'hrs'", { locale: es })
    : 'Fecha no registrada';
  const formattedDeliveryDate = deliveryDate && isValid(deliveryDate)
    ? format(deliveryDate, "dd MMMM, yyyy, HH:mm 'hrs'", { locale: es })
    : 'Fecha no registrada';

  const isAppointmentPending = status === 'agendado' && (appointmentStatus === 'Sin Confirmar' || service.subStatus === 'Sin Confirmar');

  const statusInfo = useMemo(() => {
    if (status === 'cancelado' || appointmentStatus === 'Cancelada')
      return { title: "CANCELADO", description: "Este servicio o cita ha sido cancelado.", badge: { text: "Cancelado", variant: "destructive" }, cardClass: "bg-red-50 border-red-200", titleClass: "text-red-800", descClass: "text-red-700" };
    
    if (status === 'agendado') {
      if (appointmentStatus === 'Confirmada' || service.subStatus === 'Confirmada') return { title: "CITA AGENDADA", description: formattedAppointmentDate, badge: { text: "Confirmada", variant: "success" }, cardClass: "bg-green-50 border-green-200", titleClass: "text-green-800", descClass: "text-green-700" };
      if (appointmentStatus === 'Sin Confirmar' || service.subStatus === 'Sin Confirmar') return { title: "CITA PENDIENTE DE CONFIRMACIÓN", description: formattedAppointmentDate, badge: { text: "Pendiente", variant: "waiting" }, cardClass: "bg-yellow-50 border-yellow-200", titleClass: "text-yellow-800", descClass: "text-yellow-700" };
      return { title: "CITA AGENDADA", description: formattedAppointmentDate, badge: { text: "Agendado", variant: "default" }, cardClass: "bg-blue-50 border-blue-200", titleClass: "text-blue-800", descClass: "text-blue-700" };
    }
    
    if (status === 'en taller') {
      const subStatus = service.subStatus;
      let badgeVariant: any = "secondary";
      if (subStatus === 'Ingresado') badgeVariant = "destructive";
      if (subStatus === 'En Espera de Refacciones') badgeVariant = "waiting";
      if (subStatus === 'Reparando') badgeVariant = "blue";
      if (subStatus === 'Completado') badgeVariant = "success";
      return { title: "ORDEN DE SERVICIO", description: `Ingresado: ${formattedReceptionDate}`, badge: { text: subStatus || 'En Taller', variant: badgeVariant }, cardClass: "bg-blue-50 border-blue-200", titleClass: "text-blue-800", descClass: "text-blue-700" };
    }
    
    if (status === 'entregado')
      return { title: "ORDEN DE SERVICIO", description: `Ingresado: ${formattedReceptionDate} | Entregado: ${formattedDeliveryDate}`, badge: { text: "Entregado", variant: "success" }, cardClass: "bg-green-50 border-green-200", titleClass: "text-green-800", descClass: "text-green-700" };
    
    return { title: "COTIZACIÓN DE SERVICIO", description: null, badge: null, cardClass: "bg-muted/50", titleClass: "text-foreground", descClass: "text-muted-foreground" };
  }, [status, appointmentStatus, service.subStatus, formattedAppointmentDate, formattedReceptionDate, formattedDeliveryDate]);

  const shouldShowNextService =
    status === 'entregado' &&
    service.nextServiceInfo?.date &&
    isValid(parseDate(service.nextServiceInfo.date)!);

  return (
    <>
      <Card className={cn("text-center", statusInfo.cardClass)}>
        <CardHeader className="p-4">
          <CardTitle className={cn("text-lg font-bold tracking-wider", statusInfo.titleClass)}>
            {statusInfo.title}
          </CardTitle>
          {statusInfo.description && (
            <p className={cn("font-semibold", statusInfo.descClass)}>
              {statusInfo.description}
            </p>
          )}
          {statusInfo.badge && <div className="mt-2"><Badge variant={statusInfo.badge.variant as any}>{statusInfo.badge.text}</Badge></div>}
        </CardHeader>
      </Card>

      {isAppointmentPending && onConfirmClick && (
        <div className="flex justify-center items-center gap-4 flex-wrap mt-6">
          <ConfirmDialog
            triggerButton={<Button variant="destructive" disabled={isConfirming}><Ban className="mr-2 h-4 w-4"/>Cancelar Cita</Button>}
            title="¿Estás seguro de cancelar esta cita?"
            description="Esta acción notificará al taller sobre la cancelación. Puedes volver a agendar más tarde."
            onConfirm={onCancelAppointment}
            isLoading={isConfirming}
          />
          <Button onClick={onConfirmClick} size="lg" disabled={isConfirming} className="bg-green-600 hover:bg-green-700">
            {isConfirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}
            {isConfirming ? 'Confirmando...' : 'Confirmar mi Cita'}
          </Button>
        </div>
      )}

      {shouldShowNextService && (
        <Card className="mt-4 border-red-500 bg-red-50 text-red-800">
          <CardHeader className="text-center p-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 justify-center">
              <CalendarCheck className="h-4 w-4"/>PRÓXIMO SERVICIO
            </CardTitle>
            <CardDescription className="text-red-700 font-semibold">
              Fecha: {format(parseDate(service.nextServiceInfo!.date)!, "dd 'de' MMMM 'de' yyyy", { locale: es })}
              {service.nextServiceInfo!.mileage && typeof service.nextServiceInfo!.mileage === 'number' && isFinite(service.nextServiceInfo!.mileage) && (
                <> / KM: {formatNumber(service.nextServiceInfo!.mileage)}</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
});
StatusCard.displayName = 'StatusCard';

const SheetFooter = React.memo((
  { workshopInfo, advisorName, advisorSignature }: 
  { workshopInfo: any, advisorName?: string | null, advisorSignature?: string | null }
) => (
  <div className="space-y-4">
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-40 h-16 flex-shrink-0">
            {advisorSignature && (
              <Image
                src={normalizeDataUrl(advisorSignature)}
                alt="Firma del asesor"
                fill
                style={{objectFit:"contain"}}
                sizes="160px"
              />
            )}
          </div>
          <div className="mt-2">
            <p className="font-bold text-sm leading-tight">{capitalizeWords(advisorName || 'Asesor de Servicio')}</p>
            <p className="text-xs text-muted-foreground">Asesor de Servicio</p>
          </div>
        </div>
        <div className="text-center md:text-left">
          <p className="font-semibold text-lg">{workshopInfo.footerLine1 || '¡Gracias por su preferencia!'}</p>
          <p className="text-muted-foreground">{workshopInfo.footerLine2 || 'Para dudas o aclaraciones, no dude en contactarnos.'}</p>
          {workshopInfo?.phone && (
            <a href={`https://wa.me/${String(workshopInfo.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <Button variant="link" className="text-base px-0 h-auto py-1 mt-1 bg-green-100 text-green-700 hover:bg-green-200">
                <Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2"/> {workshopInfo.phone}
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <a href={workshopInfo.googleMapsUrl || "https://share.google/7ow83ayhfb2iIOKUX"} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:google-maps" className="h-6 w-6"/></a>
          {workshopInfo?.phone && (
            <a href={`https://wa.me/${String(workshopInfo.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:whatsapp-icon" className="h-6 w-6"/></a>
          )}
          <a href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="logos:facebook" className="h-6 w-6"/></a>
          <a href="https://www.instagram.com/ranoromx" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted"><Icon icon="skill-icons:instagram" className="h-6 w-6"/></a>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/legal/terminos" target="_blank" className="hover:underline text-muted-foreground">Términos</Link>
          <span className="text-muted-foreground">|</span>
          <Link href="/legal/privacidad" target="_blank" className="hover:underline text-muted-foreground">Privacidad</Link>
        </div>
      </CardContent>
    </Card>
  </div>
));
SheetFooter.displayName = 'SheetFooter';

const SignatureActionCard = ({ onSignClick }: { onSignClick: () => void }) => (
  <Card className="bg-blue-50 border-blue-200">
    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-blue-800 font-medium text-center sm:text-left">
        Tu vehículo ya está en el taller. Por favor, autoriza los trabajos firmando la orden de servicio.
      </p>
      <Button onClick={onSignClick} className="w-full sm:w-auto flex-shrink-0">
        <Signature className="mr-2 h-4 w-4" />
        Firmar para Autorizar
      </Button>
    </CardContent>
  </Card>
);

// ---------- Main component ----------
interface ServiceSheetContentProps {
  service: ServiceRecord;
  onScheduleClick?: () => void;
  onConfirmClick?: () => void;
  onCancelAppointment: () => void;
  onShowTicketClick?: () => void;
  isConfirming?: boolean;
  onSignClick?: (type: 'reception' | 'delivery') => void;
  isSigning?: boolean;
  activeTab?: string;
  vehicle?: Vehicle | null;
}

export const ServiceSheetContent = React.forwardRef<
  HTMLDivElement,
  ServiceSheetContentProps
>(
  ({ service, onScheduleClick, onConfirmClick, isConfirming, onSignClick, isSigning, onShowTicketClick, vehicle, onCancelAppointment }, ref) => {
    const { toast } = useToast();
    const [currentActiveTab, setActiveTab] = useState('order');
    const [branding, setBranding] = useState<any>(initialWorkshopInfo);

    useEffect(() => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('workshopTicketInfo') : null;
      if (stored) {
        try { setBranding((prev: any) => ({ ...prev, ...JSON.parse(stored) })); }
        catch (e) { console.error("Could not parse workshop info from storage", e); }
      }
    }, []);
    
    const status = (service.status || '').toLowerCase();
    const showSignatureAction = onSignClick && (
      (status === 'en taller' && !service.customerSignatureReception) ||
      (status === 'entregado' && !service.customerSignatureDelivery)
    );
    const signatureActionType: 'reception' | 'delivery' = status === 'entregado' ? 'delivery' : 'reception';

    const handleCancelAppointment = async () => {
      try {
        const result = await cancelAppointmentAction(service.id);
        if (result.success) {
          toast({ title: "Cita Cancelada", description: "Tu cita ha sido cancelada exitosamente." });
        } else {
          throw new Error(result.error);
        }
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "No se pudo cancelar la cita.", variant: "destructive" });
      }
    };
    
    const tabs = useMemo(() => {
      const available = [
        { value: 'order', label: 'Orden de Servicio', content: (
          <ServiceOrderTab
            service={service}
            vehicle={vehicle}
            onSignClick={onSignClick}
            isSigning={isSigning}
            onShowTicketClick={onShowTicketClick}
          />
        )},
      ];
      if (service.safetyInspection && Object.values(service.safetyInspection).some((v: any) => v && (v as any).status && (v as any).status !== 'na')) {
        available.push({
          value: "checklist",
          label: "Revisión de Seguridad",
          content: (
            <SafetyChecklistDisplay
              inspection={
                Array.isArray(service.safetyInspection)
                  ? service.safetyInspection
                  : service.safetyInspection
                    ? [service.safetyInspection]
                    : []
              }
            />
          ),
        });
      }
      if (service.photoReports && service.photoReports.length > 0 && service.photoReports.some((r: { photos: string | any[]; }) => r.photos.length > 0)) {
        available.push({ value: 'photoreport', label: 'Reporte Fotográfico', content: <PhotoReportContent photoReports={service.photoReports} /> });
      }
      if (service.originalQuoteItems && service.originalQuoteItems.length > 0) {
        available.push({ value: 'quote', label: 'Cotización Original', content: <OriginalQuoteContent items={service.originalQuoteItems} /> });
      }
      return available;
    }, [service, vehicle, onSignClick, isSigning, onShowTicketClick]);

    return (
      <div ref={ref} className="space-y-6">
        {showSignatureAction && <SignatureActionCard onSignClick={() => onSignClick!(signatureActionType)} />}
        <SheetHeader service={service} workshopInfo={branding} />
        <ClientInfo service={service} vehicle={vehicle ?? undefined} />
        <StatusCard service={service} isConfirming={isConfirming} onConfirmClick={onConfirmClick} onCancelAppointment={handleCancelAppointment}/>
        {status === 'cotizacion' && onScheduleClick && (
          <div className="text-center">
            <Button onClick={onScheduleClick} size="lg">
              <CalendarDays className="mr-2 h-5 w-5"/>Agendar Cita
            </Button>
          </div>
        )}
        
        <div className="overflow-x-auto scrollbar-hide">
          <Tabs value={currentActiveTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="relative w-max">
              {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
            </TabsList>
            {tabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <SheetFooter workshopInfo={branding} advisorName={service.serviceAdvisorName} advisorSignature={service.serviceAdvisorSignatureDataUrl}/>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";

// ---------- Tabs content ----------
function ServiceOrderTab(
  { service, onSignClick, isSigning, onShowTicketClick }:
  { service: ServiceRecord, vehicle?: Vehicle | null, onSignClick?: (type: 'reception' | 'delivery') => void, isSigning?: boolean, onShowTicketClick?: () => void }
) {
  const items = useMemo(
    () => (service?.serviceItems ?? []).map(it => ({ ...it, price: Number(it?.sellingPrice) || 0 })),
    [service?.serviceItems]
  );
  const { subTotal, taxAmount, totalCost } = useMemo(() => {
    const total = items.reduce((acc, it: any) => acc + (it.price || 0), 0);
    const sub = total / (1 + 0.16);
    const tax = total - sub;
    return { subTotal: sub, taxAmount: tax, totalCost: total };
  }, [items]);

  const statusLower = (service.status || "").toLowerCase();
  const showReceptionCard = ["en taller", "entregado", "completado"].includes(statusLower);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Trabajos a Realizar y Costos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.length > 0 ? items.map((item: any, index: number) => (
              <div key={item.id || index} className="p-4 rounded-lg bg-background">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Insumos: {item.suppliesUsed.map((s: any) => `${s.quantity}x ${s.supplyName}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-lg">
                    {formatCurrency(item.sellingPrice ?? 0)}
                  </p>
                </div>
              </div>
            )) : <p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>}
          </div>

          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">IVA (16%):</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <Separator className="my-2"/>
            <div className="flex justify-between items-center font-bold text-base">
              <span>Total a Pagar:</span>
              <span className="text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </CardContent>

        {service.status === 'Entregado' && (
          <CardFooter className="justify-end gap-2">
            {onShowTicketClick && (
              <Button onClick={onShowTicketClick}>
                <Receipt className="mr-2 h-4 w-4"/>Ver Ticket de Servicio
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/facturar?folio=${service.folio || service.id}&total=${totalCost}`} target="_blank">
                <FileJson className="mr-2 h-4 w-4"/>Facturar
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <div className={cn("grid grid-cols-1 gap-6", service.status === 'Entregado' && "md:grid-cols-2")}>
        {showReceptionCard && (
          <Card>
            <CardHeader><CardTitle>Ingreso del Vehiculo al Taller</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ReceptionDetails service={service} />
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground whitespace-pre-line mt-2">{INGRESO_CONDICIONES_TEXT}</p>
                <h4 className="font-semibold mb-2 mt-4">Firma de Autorización</h4>
                <SignatureDisplay type="reception" signatureUrl={service.customerSignatureReception} onSignClick={onSignClick} isSigning={isSigning}/>
              </div>
            </CardContent>
          </Card>
        )}
        
        {service.status === 'Entregado' && (
          <Card>
            <CardHeader><CardTitle>Salida del Vehículo del Taller</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Garantía</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{GARANTIA_CONDICIONES_TEXT}</p>
              </div>
              <h4 className="font-semibold mb-2">Firma de Conformidad</h4>
              <SignatureDisplay type="delivery" signatureUrl={service.customerSignatureDelivery} onSignClick={onSignClick} isSigning={isSigning}/>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReceptionDetails({ service }: { service: ServiceRecord }) {
  const fuelLevelMap: Record<string, number> = {
    'Vacío': 0, '1/8': 12.5, '1/4': 25, '3/8': 37.5, '1/2': 50, '5/8': 62.5, '3/4': 75, '7/8': 87.5, 'Lleno': 100
  };
  const fuelKey = String(service.fuelLevel || "");
  const fuelPercentage = fuelLevelMap[fuelKey] ?? 0;
  const fuelColor =
    fuelPercentage <= 25 ? "bg-red-500" :
    fuelPercentage <= 50 ? "bg-orange-400" :
    fuelPercentage <= 87.5 ? "bg-yellow-400" :
    "bg-green-500";

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

function SignatureDisplay({
  type,
  signatureUrl,
  onSignClick,
  isSigning,
}: {
  type: "reception" | "delivery";
  signatureUrl?: string | null;
  onSignClick?: (type: "reception" | "delivery") => void;
  isSigning?: boolean;
}) {
  const label = type === "reception" ? "CLIENTE (RECEPCIÓN)" : "CLIENTE (ENTREGA)";
  return (
    <div className="text-center">
      <p className="text-xs font-semibold">{label}</p>
      <div className="mt-1 p-2 h-20 border rounded-md bg-background flex items-center justify-center">
        {signatureUrl ? (
          <Image
            src={normalizeDataUrl(signatureUrl)}
            alt={`Firma de ${type}`}
            width={150}
            height={75}
            style={{ objectFit: "contain" }}
            unoptimized
          />
        ) : onSignClick ? (
          <Button size="sm" onClick={() => onSignClick(type)} disabled={isSigning}>
            {isSigning ? "Cargando..." : "Firmar"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Pendiente</p>
        )}
      </div>
    </div>
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
    <Card>
      <CardHeader>
        <CardTitle>Revisión de Puntos de Seguridad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
  );
}

function PhotoReportContent({ photoReports }: { photoReports: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte Fotográfico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}

function OriginalQuoteContent({ items }: { items: any[] }) {
  const total = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conceptos de la Cotización Original</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm p-2 bg-background rounded">
              <span>{item.name}</span>
              <span className="font-semibold">{formatCurrency(item.price)}</span>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Total Original:</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
