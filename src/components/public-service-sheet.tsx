
"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, isValid, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Signature, Phone, MapPin, CalendarDays, ClipboardList, CheckCircle2, User as UserIcon } from "lucide-react";
import { formatCurrency, toNumber, IVA_RATE } from "@/lib/utils";

// --- Tipos auxiliares (ajusta a tus tipos reales) ---
type ServiceStatus = "AGENDADO" | "EN_TALLER" | "ENTREGADO" | "COTIZACION";

type Photo = { id?: string; url: string; caption?: string };

type SecurityCheckItem = {
  label: string;
  status: "ok" | "atencion" | "critico";
  notes?: string;
};

type ReceptionOrDelivery = {
  at?: string | Date;                  // fecha/hora
  notes?: string;                      // observaciones
  customerSignatureDataUrl?: string;   // firma cliente
  photos?: Photo[];                    // fotos miniatura
};

type ServiceItem = {
  id?: string;
  name: string;
  price?: number | null;
  suppliesUsed?: { quantity?: number | string; supplyName?: string }[];
};

type Vehicle = {
  label?: string; plates?: string; color?: string; vin?: string;
};

type WorkshopInfo = { name?: string; phone?: string; address?: string };

type ServiceRecordLike = {
  id: string;
  status: ServiceStatus;
  serviceDate?: string | Date;         // fecha base (para validez)
  appointmentDate?: string | Date;     // fecha de cita (AGENDADO)
  isPublicView?: boolean;
  vehicle?: Vehicle;
  customerName?: string;
  workshopInfo?: WorkshopInfo;
  serviceAdvisorName?: string;
  serviceAdvisorSignatureDataUrl?: string;
  // Conceptos / trabajos
  serviceItems?: ServiceItem[];        // para EN_TALLER/ENTREGADO (detalle del servicio)
  quoteItems?: ServiceItem[];          // si quieres mostrar cotización original
  // Recepción / Entrega
  reception?: ReceptionOrDelivery;
  delivery?: ReceptionOrDelivery;
  // Revisión de seguridad
  securityChecklist?: SecurityCheckItem[];
};

interface Props {
  record: ServiceRecordLike;
  onSignClick?: () => void;
  isSigning?: boolean;
}

export default function ServiceDocumentContent({ record, onSignClick, isSigning }: Props){
  const [activeTab, setActiveTab] = useState("resumen");
  const workshop = record.workshopInfo || { name: "Ranoro", phone: "4491425323" };
  const baseDate = toDate(record.serviceDate) || new Date();
  const validityDate = isValid(baseDate)
    ? format(addDays(baseDate, 15), "dd 'de' MMMM 'de' yyyy", { locale: es })
    : "N/A";

  // Elegir items según estado
  const items = useMemo(() => {
    const raw = record.status === "COTIZACION" || record.status === "AGENDADO"
      ? (record.quoteItems ?? record.serviceItems ?? [])
      : (record.serviceItems ?? []);
    return raw.map((it) => ({
      ...it,
      price: toNumber(it?.price, 0),
    }));
  }, [record.status, record.serviceItems, record.quoteItems]);

  const { subTotal, taxAmount, totalCost } = useMemo(() => {
    const total = items.reduce((acc, it) => acc + toNumber(it.price, 0), 0);
    const sub = total / (1 + IVA_RATE);
    const tax = total - sub;
    return { subTotal: sub, taxAmount: tax, totalCost: total };
  }, [items]);

  const hasSecurity = (record.securityChecklist?.length ?? 0) > 0;
  const showTabs = hasSecurity && (record.status === "EN_TALLER" || record.status === "ENTREGADO");

  return (
    <div className="space-y-6">
      {/* Encabezado con estado */}
      <HeaderBar record={record} validityDate={validityDate} />

      {showTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="seguridad">Rev. seguridad</TabsTrigger>
          </TabsList>
          <TabsContent value="resumen">
            <ResumenSection record={record} items={items} subTotal={subTotal} taxAmount={taxAmount} totalCost={totalCost} onSignClick={onSignClick} isSigning={isSigning}/>
          </TabsContent>
          <TabsContent value="seguridad">
            <SecuritySection checklist={record.securityChecklist!} />
          </TabsContent>
        </Tabs>
      ) : (
        <ResumenSection record={record} items={items} subTotal={subTotal} taxAmount={taxAmount} totalCost={totalCost} onSignClick={onSignClick} isSigning={isSigning}/>
      )}

      <ThanksAndContact workshop={workshop} />
    </div>
  );
}

// --- Secciones ---
function ResumenSection({
  record,
  items,
  subTotal,
  taxAmount,
  totalCost,
  onSignClick,
  isSigning,
}: {
  record: ServiceRecordLike;
  items: ServiceItem[];
  subTotal: number;
  taxAmount: number;
  totalCost: number;
  onSignClick?: () => void;
  isSigning?: boolean;
}){
  const workshop = record.workshopInfo || { name: "Ranoro", phone: "4491425323" };
  const status = record.status;
  const [infoTab, setInfoTab] = useState("cliente");

  const mainTitle = status === "EN_TALLER" || status === "ENTREGADO" ? "Detalles del Servicio" : "Detalles de la Cotización";

  return (
    <>
      {status === 'AGENDADO' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5"/> Cita agendada</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentBlock date={record.appointmentDate} />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={infoTab} onValueChange={setInfoTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cliente">Datos del Cliente</TabsTrigger>
            <TabsTrigger value="vehiculo">Datos del Vehículo</TabsTrigger>
          </TabsList>
          <TabsContent value="cliente">
            <CustomerInfoCard name={record.customerName} />
          </TabsContent>
          <TabsContent value="vehiculo">
            <VehicleInfoCard vehicle={record.vehicle} />
          </TabsContent>
        </Tabs>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>{mainTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
              {items.length > 0 ? items.map((item, i) => (
                <div key={item.id || i} className="p-4 border rounded-lg bg-background">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      {!!(item.suppliesUsed && item.suppliesUsed.length) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Insumos: {item.suppliesUsed.map((s) => `${s.quantity ?? 1}x ${s.supplyName}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(item.price)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">No hay trabajos detallados.</p>
              )}
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdvisorCard name={record.serviceAdvisorName} signature={record.serviceAdvisorSignatureDataUrl} />
        <CostsCard subTotal={subTotal} taxAmount={taxAmount} totalCost={totalCost} validityDate={toValidDate(record.serviceDate)} />
      </div>

      {(status === "EN_TALLER" || status === "ENTREGADO") && (
        <>
          <ReceptionCard kind="Recepción" data={record.reception} />
          {status === "ENTREGADO" && <ReceptionCard kind="Entrega" data={record.delivery} />}
        </>
      )}

      {record.isPublicView && onSignClick && (
        <div className="pt-2">
          <Button onClick={onSignClick} disabled={isSigning} className="w-full sm:w-auto">
            <Signature className="mr-2 h-4 w-4"/>
            {isSigning ? "Abriendo para firmar…" : "Firmar de conformidad"}
          </Button>
        </div>
      )}
    </>
  );
}

// ... Rest of the components (SecuritySection, ReceptionCard, etc.) remain the same
function SecuritySection({ checklist }: { checklist: SecurityCheckItem[] }){
  if (!checklist?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5"/> Revisión de seguridad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklist.map((it, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
            <StatusDot status={it.status} />
            <div className="flex-1">
              <div className="font-medium">{it.label}</div>
              {it.notes && <div className="text-sm text-muted-foreground mt-0.5">{it.notes}</div>}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{statusLabel(it.status)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReceptionCard({ kind, data }: { kind: "Recepción" | "Entrega"; data?: ReceptionOrDelivery }){
  if (!data) return (
    <Card>
      <CardHeader><CardTitle>{kind}</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Sin datos de {kind.toLowerCase()}.</CardContent>
    </Card>
  );

  const date = toDate(data.at);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5"/> {kind}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Fecha/hora:</span>
          <span className="font-medium">{date ? format(date, "dd/MM/yyyy HH:mm", { locale: es }) : "N/D"}</span>
        </div>
        {data.notes && (
          <div className="text-sm">
            <span className="text-muted-foreground">Notas:</span>{" "}
            <span className="font-medium">{data.notes}</span>
          </div>
        )}

        {/* Firma del cliente */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Firma del cliente</div>
          {data.customerSignatureDataUrl ? (
            <div className="p-2 border rounded-md bg-muted/50 inline-flex min-w-[140px] min-h-[70px]">
              <Image src={data.customerSignatureDataUrl} alt={`Firma ${kind}`} width={180} height={90} style={{ objectFit: 'contain' }} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No disponible</div>
          )}
        </div>

        {/* Fotos */}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Fotos</div>
          {data.photos?.length ? (
            <PhotoGrid photos={data.photos} />
          ) : (
            <div className="text-sm text-muted-foreground">Sin fotos</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerInfoCard({ name }: { name?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><UserIcon className="h-4 w-4"/> Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold">{name || "—"}</p>
      </CardContent>
    </Card>
  )
}

function VehicleInfoCard({ vehicle }: { vehicle?: Vehicle }) {
  return (
    <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Icon icon="ph:car-fill" className="h-4 w-4"/> Vehículo</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold">{vehicle?.label || "—"}</p>
        <p className="text-sm text-muted-foreground">{vehicle?.plates || "—"}</p>
      </CardContent>
    </Card>
  )
}


function AdvisorCard({ name, signature }: { name?: string; signature?: string }){
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asesor de Servicio</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        {signature && (
          <div className="p-2 border rounded-md bg-muted/50 flex items-center justify-center min-h-[60px] max-w-[140px] mx-auto">
            <Image src={signature} alt="Firma del asesor" width={140} height={70} style={{ objectFit: 'contain' }} />
          </div>
        )}
        <p className="font-semibold pt-2">{name || "Su asesor de confianza"}</p>
      </CardContent>
    </Card>
  );
}

function CostsCard({ subTotal, taxAmount, totalCost, validityDate }: { subTotal: number; taxAmount: number; totalCost: number; validityDate?: string }){
  return (
    <Card>
      <CardHeader><CardTitle>Resumen de Costos</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subTotal)}</span></div>
        <div className="flex justify-between items-center"><span className="text-muted-foreground">IVA (16%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div>
        <Separator className="my-2"/>
        <div className="flex justify-between items-center font-bold text-base"><span>Total a Pagar:</span><span className="text-primary">{formatCurrency(totalCost)}</span></div>
        {validityDate && (
          <p className="text-xs text-muted-foreground pt-2">Esta cotización es válida hasta el {validityDate}.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentBlock({ date }: { date?: string | Date }){
  const d = toDate(date);
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-background">
      <CalendarDays className="h-5 w-5 text-muted-foreground"/>
      <div>
        <div className="text-sm text-muted-foreground">Fecha y hora</div>
        <div className="text-base font-semibold">{d ? format(d, "eeee d 'de' MMMM, HH:mm 'hrs'", { locale: es }) : "Por confirmar"}</div>
      </div>
    </div>
  );
}

function ThanksAndContact({ workshop }: { workshop: WorkshopInfo }){
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p>¡Gracias por su preferencia!</p>
        <p className="text-sm mt-1">Para dudas o aclaraciones, no dude en contactarnos.</p>
        <a href={`tel:${workshop.phone || '4491425323'}`} className="text-lg font-semibold flex items-center justify-center gap-2 mt-2 text-primary hover:underline">
          <Icon icon="solar:phone-bold" className="h-5 w-5"/>
          <span>{workshop.phone || '4491425323'}</span>
        </a>
        <div className="flex justify-center items-center gap-4 mt-4">
          <Link href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer" title="WhatsApp">
            <Icon icon="logos:whatsapp-icon" className="h-7 w-7 transition-transform hover:scale-110"/>
          </Link>
          <Link href="https://maps.app.goo.gl/dCixrtimpLDRakCC9" target="_blank" rel="noopener noreferrer" title="Google Maps">
            <Icon icon="logos:google-maps" className="h-7 w-7 transition-transform hover:scale-110"/>
          </Link>
          <Link href="https://www.facebook.com/ranoromx" target="_blank" rel="noopener noreferrer" title="Facebook">
            <Icon icon="logos:facebook" className="h-7 w-7 transition-transform hover:scale-110"/>
          </Link>
          <Link href="https://www.instagram.com/ranoromx/" target="_blank" rel="noopener noreferrer" title="Instagram">
            <Icon icon="skill-icons:instagram" className="h-7 w-7 transition-transform hover:scale-110"/>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoGrid({ photos }: { photos: Photo[] }){
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {photos.map((p, i) => (
        <a key={p.id || i} href={p.url} target="_blank" rel="noopener noreferrer" className="group block">
          <div className="aspect-video rounded-lg overflow-hidden border bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption || `Foto ${i+1}`} className="h-full w-full object-cover group-hover:opacity-95" />
          </div>
          {p.caption && <div className="mt-1 text-xs text-muted-foreground truncate">{p.caption}</div>}
        </a>
      ))}
    </div>
  );
}

function HeaderBar({ record, validityDate }: { record: ServiceRecordLike; validityDate: string }){
  const vehicle = record.vehicle || {};
  const statusInfo = {
    AGENDADO: { label: "Cita Agendada", class: "bg-amber-50 text-amber-700 ring-amber-200" },
    EN_TALLER: { label: "Servicio en Taller", class: "bg-sky-50 text-sky-700 ring-sky-200" },
    ENTREGADO: { label: "Servicio Entregado", class: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    COTIZACION: { label: "Cotización", class: "bg-gray-50 text-gray-700 ring-gray-200" },
  }[record.status];

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{statusInfo.label}</div>
            <div className="text-lg md:text-xl font-extrabold truncate">
              {record.id}
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${statusInfo.class}`}>
            <span className="text-xs font-bold">Válida hasta</span>
            <span className="font-mono text-sm font-extrabold">{validityDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Utilidades locales ---
function toDate(v?: string | Date){
  if (!v) return undefined;
  const d = typeof v === 'string' ? parseISO(v) : v;
  return isValid(d) ? d : undefined;
}

function toValidDate(v?: string | Date){
  const d = toDate(v);
  return d ? format(addDays(d, 15), "dd 'de' MMMM 'de' yyyy", { locale: es }) : undefined;
}

function StatusDot({ status }: { status: SecurityCheckItem["status"] }){
  const cls = status === "ok" ? "bg-emerald-500" : status === "atencion" ? "bg-amber-500" : "bg-rose-600";
  return <span className={`mt-1 h-2.5 w-2.5 rounded-full ${cls}`} />;
}

function statusLabel(s: SecurityCheckItem["status"]) {
  return s === "ok" ? "OK" : s === "atencion" ? "Atención" : "Crítico";
}
