// src/app/(app)/servicios/components/lists/history-list.tsx
"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  UserX,
  DollarSign,
  Package,
  XCircle,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
import { calcEffectiveProfit, calcSuppliesCostFromItems } from "@/lib/money-helpers";
import { exportToCsv } from "@/lib/services/export.service";
import { HistorySummary } from "../shared/history-summary";
import type { ServiceRecord, Vehicle, User } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceListCard } from "../cards/service-list-card";
import {
  format as formatFns,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import { serviceService } from "@/lib/services";

const MIN_SEARCH_LENGTH = 2;

const toNumber = (v: unknown) => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

type QuickFilter = "sin-tecnico" | "sin-cobrar" | "sin-insumos" | "cancelados";

const QUICK_FILTERS: {
  id: QuickFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "sin-tecnico", label: "Sin Técnico", icon: UserX },
  { id: "sin-cobrar", label: "Sin Cobrar", icon: DollarSign },
  { id: "sin-insumos", label: "Sin Insumos", icon: Package },
  { id: "cancelados", label: "Cancelados", icon: XCircle },
];

/** Build current-week range: Monday to Saturday */
function getCurrentWeekRange() {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const saturday = addDays(monday, 5); // Mon + 5 = Sat
  return { from: startOfDay(monday), to: endOfDay(saturday) };
}

interface HistoryListProps {
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onView: (service: ServiceRecord) => void;
  onShowTicket: (service: ServiceRecord) => void;
  onDelete: (id: string) => Promise<void>;
}

export function HistoryList({
  vehicles,
  personnel,
  currentUser,
  onView,
  onShowTicket,
  onDelete,
}: HistoryListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [remoteServices, setRemoteServices] = useState<ServiceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dateField, setDateField] = useState<'serviceDate' | 'deliveryDateTime'>('serviceDate');

  // Default: Monday to Saturday of current week
  const initialRange = useMemo(() => getCurrentWeekRange(), []);

  const tm = useTableManager<ServiceRecord>({
    initialData: remoteServices,
    searchKeys: [
      "id",
      "folio",
      "vehicleIdentifier",
      "customerName",
      "serviceItems.name",
      "technicianName",
      "serviceAdvisorName",
    ],
    // No dateFilterKey — Firestore query already handles date filtering server-side
    initialSortOption: "folio_desc",
    itemsPerPage: 25,
    initialDateRange: initialRange,
    minSearchLength: MIN_SEARCH_LENGTH,
  });

  // Fetch historical services from Firestore whenever date range or dateField changes
  useEffect(() => {
    const range = tm.dateRange;
    if (!range?.from) return;
    setIsLoadingHistory(true);
    const startIso = startOfDay(range.from).toISOString();
    const endIso = range.to
      ? endOfDay(range.to).toISOString()
      : endOfDay(range.from).toISOString();

    const unsub = serviceService.onHistoricalServicesUpdate(startIso, endIso, (data) => {
      setRemoteServices(data);
      setIsLoadingHistory(false);
    }, dateField);
    return () => unsub();
  }, [tm.dateRange, dateField]);

  // Apply quick filters to the full filtered data, then paginate manually
  const quickFilteredData = useMemo(() => {
    if (activeQuickFilters.size === 0) return tm.fullFilteredData;
    return tm.fullFilteredData.filter((s) => {
      for (const f of activeQuickFilters) {
        if (f === "sin-tecnico" && (s.technicianId || s.technicianName)) return false;
        if (f === "sin-cobrar") {
          const hasPay = Array.isArray(s.payments) && s.payments.length > 0;
          const hasTotal = toNumber(s.totalCost) > 0;
          if (hasPay || hasTotal) return false;
        }
        if (f === "sin-insumos") {
          const hasIns = s.serviceItems?.some(
            (i) => Array.isArray(i.suppliesUsed) && i.suppliesUsed.length > 0
          );
          if (hasIns) return false;
        }
        if (f === "cancelados" && s.status !== "Cancelado") return false;
      }
      return true;
    });
  }, [tm.fullFilteredData, activeQuickFilters]);

  // Use tm pagination when no quick filters, otherwise paginate quickFilteredData
  const displayData = useMemo(() => {
    if (activeQuickFilters.size === 0) return tm.paginatedData;
    const start = (tm.currentPage - 1) * 25;
    return quickFilteredData.slice(start, start + 25);
  }, [activeQuickFilters, tm.paginatedData, tm.currentPage, quickFilteredData]);

  const toggleFilter = (id: QuickFilter) => {
    setActiveQuickFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setPreset = (p: "today" | "week" | "month" | "lastMonth") => {
    const now = new Date();
    const ranges = {
      today: { from: startOfDay(now), to: endOfDay(now) },
      week: getCurrentWeekRange(),
      month: { from: startOfMonth(now), to: endOfMonth(now) },
      lastMonth: { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
    };
    tm.onDateRangeChange(ranges[p]);
  };

  const handleExport = () => {
    const dataToExport = activeQuickFilters.size > 0 ? quickFilteredData : tm.fullFilteredData;
    if (!dataToExport.length) {
      toast({ title: "Sin datos para exportar", variant: "destructive" });
      return;
    }
    const rows = dataToExport.map((s) => {
      const v = vehicles.find((veh) => veh.id === s.vehicleId);
      const totalCost = toNumber(s.totalCost || (s as any).total || 0);
      const payMethod = s.payments?.length
        ? Array.from(new Set(s.payments.map((p) => p.method))).join(" / ")
        : (s as any).paymentMethod || "N/A";
      return {
        folio: s.folio || s.id.slice(-6),
        fecha: s.deliveryDateTime
          ? formatFns(new Date(s.deliveryDateTime), "dd/MM/yyyy HH:mm", { locale: es })
          : "",
        cliente: s.customerName || "N/A",
        telefono: s.customerPhone || "N/A",
        vehiculo: s.vehicleIdentifier || "N/A",
        placas: v?.licensePlate || "N/A",
        trabajos: s.serviceItems.map((i) => i.name).join("; "),
        metodo_pago: payMethod,
        total_cliente: totalCost,
        costo_insumos: calcSuppliesCostFromItems(s.serviceItems),
        comision_banco: toNumber(s.cardCommission),
        ganancia_real: calcEffectiveProfit(s),
        asesor: s.serviceAdvisorName || "N/A",
        tecnico: s.technicianName || "N/A",
        estatus: s.status,
        notas: s.notes || "",
      };
    });
    exportToCsv({
      data: rows,
      headers: [
        { key: "folio", label: "Folio" },
        { key: "fecha", label: "Fecha Entrega" },
        { key: "cliente", label: "Cliente" },
        { key: "telefono", label: "Teléfono" },
        { key: "vehiculo", label: "Vehículo" },
        { key: "placas", label: "Placas" },
        { key: "trabajos", label: "Trabajos" },
        { key: "metodo_pago", label: "Método de Pago" },
        { key: "total_cliente", label: "Total Cobrado" },
        { key: "costo_insumos", label: "Costo Insumos" },
        { key: "comision_banco", label: "Comisión Bancaria" },
        { key: "ganancia_real", label: "Ganancia Real" },
        { key: "asesor", label: "Asesor" },
        { key: "tecnico", label: "Técnico" },
        { key: "estatus", label: "Estatus" },
        { key: "notas", label: "Notas" },
      ],
      fileName: "historial_servicios",
    });
  };

  const handleEdit = useCallback(
    (id: string) => router.push(`/servicios/${id}`),
    [router]
  );

  // Effective counts for pagination display
  const effectiveTotal = activeQuickFilters.size > 0 ? quickFilteredData.length : tm.totalItems;
  const effectiveTotalPages = Math.ceil(effectiveTotal / 25);

  return (
    <div className="space-y-4">
      {/* Summary Cards — always reflect the full filtered + quick-filtered data */}
      <HistorySummary filteredServices={quickFilteredData} />

      {/* ═══ LINE 1: Date range picker, date field selector, preset buttons, export button ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <DatePickerWithRange date={tm.dateRange} onDateChange={tm.onDateRangeChange} />
        <Select value={dateField} onValueChange={(v) => setDateField(v as 'serviceDate' | 'deliveryDateTime')}>
          <SelectTrigger className="h-9 w-full sm:w-[200px] bg-white border-border text-foreground shrink-0">
            <CalendarDays className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="serviceDate">Fecha de Recepción</SelectItem>
            <SelectItem value="deliveryDateTime">Fecha de Entrega</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["today", "week", "month", "lastMonth"] as const).map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => setPreset(p)}
              className="whitespace-nowrap text-xs h-9 bg-white border-border text-foreground hover:bg-muted"
            >
              {p === "today" ? "Hoy" : p === "week" ? "Esta semana" : p === "month" ? "Este mes" : "Mes pasado"}
            </Button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <Button
            onClick={handleExport}
            size="sm"
            className="h-9 bg-zinc-700 text-white hover:bg-zinc-800 border-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ═══ LINE 2: Search, Status filter, Sort/Folio, Quick filter buttons ═══ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
        {/* Search — takes remaining width */}
        <div className="relative flex-1 w-full lg:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={`Buscar por nombre, folio, vehículo…`}
            value={tm.searchTerm}
            onChange={(e) => tm.onSearchTermChange(e.target.value)}
            className="h-9 bg-background pl-9 pr-8"
          />
          {tm.searchTerm && (
            <button
              onClick={() => tm.onSearchTermChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status selector */}
        <Select
          value={tm.otherFilters["status"] || "all"}
          onValueChange={(v) => tm.setOtherFilters({ ...tm.otherFilters, status: v })}
        >
          <SelectTrigger className="h-9 w-full lg:w-[160px] bg-white border-border text-foreground shrink-0">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Entregado">Entregado</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort selector */}
        <Select value={tm.sortOption} onValueChange={tm.onSortOptionChange}>
          <SelectTrigger className="h-9 w-full lg:w-[180px] bg-white border-border text-foreground shrink-0">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="folio_desc">Folio (Reciente)</SelectItem>
            <SelectItem value="folio_asc">Folio (Antiguo)</SelectItem>
            <SelectItem value="deliveryDateTime_desc">Fecha (Reciente)</SelectItem>
            <SelectItem value="deliveryDateTime_asc">Fecha (Antiguo)</SelectItem>
            <SelectItem value="totalCost_desc">Costo (Mayor)</SelectItem>
            <SelectItem value="totalCost_asc">Costo (Menor)</SelectItem>
          </SelectContent>
        </Select>

        {/* Quick filter buttons — aligned left, same height as search */}
        <div className="flex items-center gap-1.5 shrink-0">
          {QUICK_FILTERS.map(({ id, label, icon: Ico }) => {
            const isActive = activeQuickFilters.has(id);
            return (
              <Button
                key={id}
                variant="outline"
                size="sm"
                onClick={() => toggleFilter(id)}
                className={cn(
                  "h-9 text-xs gap-1.5 bg-white border-border",
                  isActive && "bg-zinc-800 text-white border-zinc-800 hover:bg-zinc-700 hover:text-white"
                )}
              >
                <Ico className="h-3.5 w-3.5" />
                {label}
                {isActive && <X className="h-3 w-3 ml-0.5" />}
              </Button>
            );
          })}
          {activeQuickFilters.size > 0 && (
            <button
              onClick={() => setActiveQuickFilters(new Set())}
              className="text-xs text-muted-foreground underline hover:text-foreground ml-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Pagination Header */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {tm.isSearchActive
            ? `${effectiveTotal} resultados`
            : `Mostrando ${displayData.length > 0 ? (tm.currentPage - 1) * 25 + 1 : 0} a ${Math.min(tm.currentPage * 25, effectiveTotal)} de ${effectiveTotal} resultados`}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={tm.goToPreviousPage}
            disabled={!tm.canGoPrevious}
            className="bg-white border-border text-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={tm.goToNextPage}
            disabled={tm.currentPage >= effectiveTotalPages}
            className="bg-white border-border text-foreground hover:bg-muted"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="relative min-h-[400px]">
        {isLoadingHistory && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xs z-10 flex flex-col items-center justify-center rounded-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <span className="text-muted-foreground font-medium">Cargando historial...</span>
          </div>
        )}
        <div className="space-y-3">
          {displayData.length > 0 ? (
            displayData.map((r) => (
              <ServiceListCard
                key={r.id}
                service={r}
                vehicle={vehicles.find((v) => v.id === r.vehicleId)}
                personnel={personnel}
                currentUser={currentUser}
                onEdit={() => handleEdit(r.id)}
                onView={() => onView(r)}
                onShowTicket={() => onShowTicket(r)}
              />
            ))
          ) : (
            !isLoadingHistory && (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-card/50">
                <FileText className="h-12 w-12 mb-3 opacity-20" />
                <h3 className="text-lg font-semibold text-foreground">Sin resultados</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajusta los filtros o el rango de fechas.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
