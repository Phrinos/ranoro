"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wrench, Loader2, CalendarDays, Car, DollarSign, FileJson,
  CheckCircle2, AlertTriangle, PlayCircle, RefreshCw, ShieldCheck,
  CalendarX2, Truck, PackageX, Scale, Ticket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { parseDate } from "@/lib/forms";
import { generateTicketId, cn } from '@/lib/utils';
import { isBefore, subDays } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────

type ResultState = {
  message: string;
  type: 'success' | 'warning' | 'error';
};

// ─── Action button component ────────────────────────────────────────────────

interface ActionRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionId: string;
  accentColor: string; // e.g. "blue"
  loadingAction: string | null;
  result?: ResultState;
  onRun: (id: string) => void;
}

const COLOR_MAP: Record<string, { badge: string; result: { success: string; warning: string; error: string }; button: string; loader: string }> = {
  blue: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    result: {
      success: 'bg-blue-50 border-blue-200 text-blue-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      error:   'bg-red-50 border-red-200 text-red-700',
    },
    button: 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900',
    loader: 'text-blue-500',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    result: {
      success: 'bg-orange-50 border-orange-200 text-orange-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      error:   'bg-red-50 border-red-200 text-red-700',
    },
    button: 'hover:bg-orange-50 hover:border-orange-300 hover:text-orange-900',
    loader: 'text-orange-500',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    result: {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      error:   'bg-red-50 border-red-200 text-red-700',
    },
    button: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900',
    loader: 'text-emerald-500',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    result: {
      success: 'bg-purple-50 border-purple-200 text-purple-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      error:   'bg-red-50 border-red-200 text-red-700',
    },
    button: 'hover:bg-purple-50 hover:border-purple-300 hover:text-purple-900',
    loader: 'text-purple-500',
  },
};

function ActionRow({ icon: Icon, title, description, actionId, accentColor, loadingAction, result, onRun }: ActionRowProps) {
  const isRunning = loadingAction === actionId;
  const isAnyRunning = loadingAction !== null;
  const colors = COLOR_MAP[accentColor] ?? COLOR_MAP.blue;

  const ResultIcon = result?.type === 'success' ? CheckCircle2
    : result?.type === 'warning' ? AlertTriangle
    : AlertTriangle;

  return (
    <div className={cn(
      "rounded-xl border bg-white/60 transition-all duration-200",
      isRunning ? "shadow-md ring-1 ring-inset ring-current/10" : "shadow-xs",
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon bubble */}
        <div className={cn("shrink-0 rounded-lg p-2", colors.badge)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-tight">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
        </div>

        {/* Button */}
        <button
          onClick={() => !isAnyRunning && onRun(actionId)}
          disabled={isAnyRunning}
          className={cn(
            "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all duration-150",
            "bg-white border-slate-200 text-slate-600",
            !isAnyRunning && colors.button,
            isAnyRunning && !isRunning && "opacity-40 cursor-not-allowed",
            isRunning && "bg-white cursor-wait",
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className={cn("h-3.5 w-3.5 animate-spin", colors.loader)} />
              <span className={colors.loader}>Ejecutando…</span>
            </>
          ) : (
            <>
              <PlayCircle className="h-3.5 w-3.5" />
              Ejecutar
            </>
          )}
        </button>
      </div>

      {/* Result banner */}
      {result && (
        <div className={cn(
          "mx-3 mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium leading-snug animate-in fade-in slide-in-from-top-1 duration-300",
          colors.result[result.type],
        )}>
          <ResultIcon className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}

// ─── Category card ──────────────────────────────────────────────────────────

interface CategoryCardProps {
  icon: React.ElementType;
  title: string;
  accentColor: string;
  borderColor: string;
  headerGradient: string;
  count: number;
  children: React.ReactNode;
}

function CategoryCard({ icon: Icon, title, accentColor, borderColor, headerGradient, count, children }: CategoryCardProps) {
  const colors = COLOR_MAP[accentColor] ?? COLOR_MAP.blue;
  return (
    <Card className={cn("shadow-md overflow-hidden border-0 ring-1 ring-slate-200/80", borderColor)}>
      {/* Colored header strip */}
      <div className={cn("px-5 py-4 flex items-center justify-between", headerGradient)}>
        <div className="flex items-center gap-2.5">
          <div className="bg-white/30 rounded-lg p-1.5">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-wide">{title}</span>
        </div>
        <Badge className="bg-white/25 text-white border-white/30 text-[10px] font-black px-2 py-0.5 shadow-none">
          {count} acción{count !== 1 ? 'es' : ''}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-2.5">
        {children}
      </CardContent>
    </Card>
  );
}


// ─── Main component ─────────────────────────────────────────────────────────

export function ConfigMantenimientoPageContent() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ResultState>>({});
  const { toast } = useToast();

  const handleAction = async (actionId: string, actionFn: () => Promise<string>) => {
    setLoadingAction(actionId);
    toast({ title: "Iniciando…", description: "Escaneando la base de datos, por favor espera." });
    try {
      const message = await actionFn();
      const isAlert = message.toLowerCase().includes('alerta') || message.toLowerCase().includes('sin ') || Number(message.match(/\d+/)?.[0]) > 0;
      const type = message.toLowerCase().includes('alerta') ? 'warning' : 'success';
      setResults(prev => ({ ...prev, [actionId]: { message, type } }));
      toast({ title: "Completado", description: message });
    } catch (e: any) {
      console.error(`Error en ${actionId}:`, e);
      setResults(prev => ({ ...prev, [actionId]: { message: e.message || "Error desconocido al ejecutar.", type: 'error' } }));
      toast({ title: "Error", description: e.message || "Error desconocido", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  // ── 1. Fechas y Cronología ────────────────────────────────────────────────

  const executeFixChronology = async () => {
    const q = query(collection(db, "serviceRecords"), where("status", "==", "Entregado"));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let updates = 0;

    snap.forEach((d) => {
      const s = d.data();
      if (!s.deliveryDateTime) {
        const candidate =
          parseDate(s.completedAt) || parseDate(s.closedAt) ||
          (Array.isArray(s.payments) && s.payments.length ? parseDate(s.payments[0]?.date) : null) ||
          parseDate(s.serviceDate) || new Date();
        batch.update(doc(db, "serviceRecords", d.id), { deliveryDateTime: candidate.toISOString() });
        updates++;
      }
    });

    if (updates > 0) await batch.commit();
    return updates > 0
      ? `Se corrigió la fecha de entrega en ${updates} servicio${updates > 1 ? 's' : ''}.`
      : "Todos los servicios entregados tienen fecha correcta.";
  };

  const executeCleanOrphanAppointments = async () => {
    const q = query(collection(db, "serviceRecords"), where("status", "==", "Agendado"));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let canceled = 0;
    const thirtyDaysAgo = subDays(new Date(), 30);

    snap.forEach((d) => {
      const s = d.data();
      const appointmentDate = parseDate(s.appointmentDateTime);
      if (appointmentDate && isBefore(appointmentDate, thirtyDaysAgo)) {
        batch.update(doc(db, "serviceRecords", d.id), {
          status: "Cancelado",
          cancellationReason: "Mantenimiento automático: Cita expirada",
        });
        canceled++;
      }
    });

    if (canceled > 0) await batch.commit();
    return canceled > 0
      ? `Se cancelaron ${canceled} cita${canceled > 1 ? 's' : ''} fantasma muy antigua${canceled > 1 ? 's' : ''}.`
      : "El calendario de citas se encuentra completamente limpio.";
  };

  // ── 2. Integridad de Flotilla ─────────────────────────────────────────────

  const executeAuditVehicles = async () => {
    const snap = await getDocs(collection(db, "vehicles"));
    let orphans = 0;
    let missingPlates = 0;

    snap.forEach((d) => {
      const v = d.data();
      if (!v.ownerId) orphans++;
      if (!v.licensePlate || v.licensePlate.trim() === '') missingPlates++;
    });

    if (orphans === 0 && missingPlates === 0)
      return "Toda la flotilla cuenta con dueños y placas registrados.";
    return `Alerta: ${orphans} vehículo${orphans !== 1 ? 's' : ''} sin dueño asignado, ${missingPlates} sin placa válida. Revisa el catálogo de flotilla.`;
  };

  const executeSyncVehicleStates = async () => {
    const servicesSnap = await getDocs(collection(db, "serviceRecords"));
    const latestServices: Record<string, { date: Date; status: string }> = {};

    servicesSnap.forEach(d => {
      const s = d.data();
      if (!s.vehicleId) return;
      const dte = parseDate(s.receptionDateTime || s.appointmentDateTime || s.createdAt || s.serviceDate);
      if (dte) {
        if (!latestServices[s.vehicleId] || dte > latestServices[s.vehicleId].date) {
          latestServices[s.vehicleId] = { date: dte, status: s.status };
        }
      }
    });

    const vSnap = await getDocs(collection(db, "vehicles"));
    const batch = writeBatch(db);
    let updates = 0;

    vSnap.forEach(d => {
      const v = d.data();
      const latest = latestServices[d.id];
      if (latest) {
        const formattedDate = latest.date.toISOString();
        if (v.lastServiceDate !== formattedDate) {
          batch.update(doc(db, "vehicles", d.id), { lastServiceDate: formattedDate });
          updates++;
        }
      }
    });

    if (updates > 0) await batch.commit();
    return updates > 0
      ? `Se sincronizó la fecha de último servicio en ${updates} vehículo${updates > 1 ? 's' : ''}.`
      : "Todos los vehículos están sincronizados correctamente.";
  };

  // ── 3. Inventario y Finanzas ──────────────────────────────────────────────

  const executeResetNegativeInventory = async () => {
    const snap = await getDocs(collection(db, "inventory"));
    const batch = writeBatch(db);
    let updates = 0;

    snap.forEach((d) => {
      const item = d.data();
      if (typeof item.quantity === 'number' && item.quantity < 0) {
        batch.update(doc(db, "inventory", d.id), { quantity: 0 });
        updates++;
      }
    });

    if (updates > 0) await batch.commit();
    return updates > 0
      ? `Se detectaron y resetearon a cero ${updates} artículo${updates > 1 ? 's' : ''} con stock negativo.`
      : "El inventario no presenta artículos con stock negativo.";
  };

  const executeAuditCashDrawerDiscrepancies = async () => {
    const oneDayAgo = subDays(new Date(), 1);

    const salesSnap = await getDocs(collection(db, "sales"));
    const recentCashSales: any[] = [];
    salesSnap.forEach(d => {
      const s = d.data();
      if (s.status === "Completado" && s.saleDate) {
        const sDate = parseDate(s.saleDate);
        if (sDate && sDate >= oneDayAgo) {
          const hasCash = Array.isArray(s.payments) && s.payments.some((p: any) => p.method === "Efectivo");
          if (hasCash) recentCashSales.push({ id: d.id, ...s });
        }
      }
    });

    const cashSnap = await getDocs(collection(db, "cashDrawerTransactions"));
    const cashIds = new Set<string>();
    cashSnap.forEach(d => {
      const c = d.data();
      if (c.date) {
        const cDate = parseDate(c.date);
        if (cDate && cDate >= oneDayAgo && c.relatedId) cashIds.add(c.relatedId);
      }
    });

    const discrepancies = recentCashSales.filter(s => !cashIds.has(s.id)).length;

    return discrepancies > 0
      ? `Alerta: ${discrepancies} venta${discrepancies > 1 ? 's' : ''} en efectivo (últimas 24 h) sin registro en caja.`
      : "Auditoría limpia: Todas las ventas en efectivo concuerdan con los registros de caja.";
  };

  // ── 4. Normalización Fiscal ───────────────────────────────────────────────

  const executeStandardizeTickets = async () => {
    const snap = await getDocs(collection(db, "serviceRecords"));
    const batch = writeBatch(db);
    let updates = 0;

    snap.forEach((d) => {
      const s = d.data();
      if (!s.folio || (s.folio.length > 10 && !s.folio.startsWith('RNR-'))) {
        batch.update(doc(db, "serviceRecords", d.id), { folio: generateTicketId() });
        updates++;
      }
    });

    if (updates > 0) await batch.commit();
    return updates > 0
      ? `Se inyectaron folios (RNR-XXXX) a ${updates} servicio${updates > 1 ? 's' : ''} con formato antiguo.`
      : "Todos los servicios ya cuentan con folios homologados.";
  };

  // ─── Shortcuts ──────────────────────────────────────────────────────────────

  const run = (id: string, fn: () => Promise<string>) => handleAction(id, fn);
  const result = (id: string) => results[id];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 py-2">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-5 shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/5" />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-white/10 p-3 shadow-inner">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Suite de Mantenimiento
              <Badge className="bg-white/15 text-white border-white/20 text-[10px] font-black shadow-none ml-1">
                Superadmin
              </Badge>
            </h2>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Ejecuta validaciones automáticas sobre Firestore para corregir asimetrías, datos corruptos e inconsistencias históricas.{' '}
              <span className="text-slate-300 font-semibold">Recomendado al menos una vez al mes.</span>
            </p>
          </div>

          {/* Global running indicator */}
          {loadingAction && (
            <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/10 rounded-lg px-3 py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Procesando…
            </div>
          )}
        </div>

        {/* Quick stats bar */}
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Cronología', count: 2, color: 'text-blue-400' },
            { label: 'Flotilla',   count: 2, color: 'text-orange-400' },
            { label: 'Finanzas',   count: 2, color: 'text-emerald-400' },
            { label: 'Fiscal',     count: 1, color: 'text-purple-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-lg bg-white/5 px-3 py-2 text-center">
              <p className={cn("text-lg font-black", color)}>{count}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Fechas y Cronología ─────────────────────────────────────── */}
        <CategoryCard
          icon={CalendarDays}
          title="Fechas y Cronología"
          accentColor="blue"
          borderColor="ring-blue-100"
          headerGradient="bg-linear-to-r from-blue-600 to-blue-500"
          count={2}
        >
          <ActionRow
            icon={CalendarDays}
            title="Corregir Fechas de Entrega"
            description="Inyecta fecha de entrega estimada a servicios Finalizados que la omitieron."
            actionId="chrono_deliveries"
            accentColor="blue"
            loadingAction={loadingAction}
            result={result('chrono_deliveries')}
            onRun={(id) => run(id, executeFixChronology)}
          />
          <ActionRow
            icon={CalendarX2}
            title="Limpiar Citas Fantasma"
            description="Cancela automáticamente citas con más de 30 días de antigüedad sin atender."
            actionId="chrono_ghosts"
            accentColor="blue"
            loadingAction={loadingAction}
            result={result('chrono_ghosts')}
            onRun={(id) => run(id, executeCleanOrphanAppointments)}
          />
        </CategoryCard>

        {/* ── Integridad Flotilla ──────────────────────────────────────── */}
        <CategoryCard
          icon={Truck}
          title="Integridad Flotilla"
          accentColor="orange"
          borderColor="ring-orange-100"
          headerGradient="bg-linear-to-r from-orange-500 to-amber-500"
          count={2}
        >
          <ActionRow
            icon={Car}
            title="Auditar Vehículos Huérfanos"
            description="Detecta autos sin dueño asignado o sin placa capturada en el catálogo."
            actionId="fleet_audit"
            accentColor="orange"
            loadingAction={loadingAction}
            result={result('fleet_audit')}
            onRun={(id) => run(id, executeAuditVehicles)}
          />
          <ActionRow
            icon={RefreshCw}
            title="Sincronizar Estados de Flotilla"
            description="Actualiza lastServiceDate de cada vehículo con base en sus tickets reales."
            actionId="fleet_sync"
            accentColor="orange"
            loadingAction={loadingAction}
            result={result('fleet_sync')}
            onRun={(id) => run(id, executeSyncVehicleStates)}
          />
        </CategoryCard>

        {/* ── Inventario y Finanzas ────────────────────────────────────── */}
        <CategoryCard
          icon={DollarSign}
          title="Inventario y Finanzas"
          accentColor="emerald"
          borderColor="ring-emerald-100"
          headerGradient="bg-linear-to-r from-emerald-600 to-teal-500"
          count={2}
        >
          <ActionRow
            icon={PackageX}
            title="Limpiar Stock Negativos"
            description="Detecta refacciones con cantidad negativa por ventas paralelas y las restaura a 0."
            actionId="inv_negatives"
            accentColor="emerald"
            loadingAction={loadingAction}
            result={result('inv_negatives')}
            onRun={(id) => run(id, executeResetNegativeInventory)}
          />
          <ActionRow
            icon={Scale}
            title="Auditar Discrepancias en Caja"
            description="Cruza ventas en efectivo de las últimas 24 h contra los registros de caja chica."
            actionId="cash_audit"
            accentColor="emerald"
            loadingAction={loadingAction}
            result={result('cash_audit')}
            onRun={(id) => run(id, executeAuditCashDrawerDiscrepancies)}
          />
        </CategoryCard>

        {/* ── Validaciones Fiscales ────────────────────────────────────── */}
        <CategoryCard
          icon={ShieldCheck}
          title="Validaciones Fiscales"
          accentColor="purple"
          borderColor="ring-purple-100"
          headerGradient="bg-linear-to-r from-purple-600 to-violet-500"
          count={1}
        >
          <ActionRow
            icon={Ticket}
            title="Normalizar Folios (RNR-XXXX)"
            description="Inyecta un folio corto homologado a servicios con IDs de Firestore en formato antiguo."
            actionId="fiscal_standardize"
            accentColor="purple"
            loadingAction={loadingAction}
            result={result('fiscal_standardize')}
            onRun={(id) => run(id, executeStandardizeTickets)}
          />

          {/* Info banner */}
          <div className="flex items-start gap-2.5 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2.5 text-xs text-purple-700">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
            <span>
              Esta acción no elimina ni clona documentos. Solo añade el campo <code className="font-mono font-bold bg-purple-100 px-1 rounded">folio</code> para compatibilidad con el portal de facturación.
            </span>
          </div>
        </CategoryCard>

      </div>
    </div>
  );
}
