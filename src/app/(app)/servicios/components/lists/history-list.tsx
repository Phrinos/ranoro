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
import type { ServiceRecord, Vehicle, User, PaymentMethod } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceListCard } from "../cards/service-list-card";
import {
  isValid,
  format as formatFns,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import { serviceService } from "@/lib/services";

const MIN_SEARCH_LENGTH = 6;
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
  color: string;
}[] = [
  {
    id: "sin-tecnico",
    label: "Sin Técnico",
    icon: UserX,
    color:
      "text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100 data-[active=true]:bg-orange-500 data-[active=true]:text-white data-[active=true]:border-orange-500",
  },
  {
    id: "sin-cobrar",
    label: "Sin Cobrar",
    icon: DollarSign,
    color:
      "text-red-600 border-red-300 bg-red-50 hover:bg-red-100 data-[active=true]:bg-red-500 data-[active=true]:text-white data-[active=true]:border-red-500",
  },
  {
    id: "sin-insumos",
    label: "Sin Insumos",
    icon: Package,
    color:
      "text-purple-600 border-purple-300 bg-purple-50 hover:bg-purple-100 data-[active=true]:bg-purple-500 data-[active=true]:text-white data-[active=true]:border-purple-500",
  },
  {
    id: "cancelados",
    label: "Cancelados",
    icon: XCircle,
    color:
      "text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100 data-[active=true]:bg-gray-600 data-[active=true]:text-white data-[active=true]:border-gray-600",
  },
];

function applyQuickFilters(
  data: ServiceRecord[],
  active: Set<QuickFilter>
): ServiceRecord[] {
  if (active.size === 0) return data;
  return data.filter((s) => {
    for (const f of active) {
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

  const initialRange = useMemo(
    () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    []
  );

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
    dateFilterKey: (item) => parseDate(item.deliveryDateTime || item.serviceDate),
    initialSortOption: "folio_desc",
    itemsPerPage: 25,
    initialDateRange: initialRange,
    minSearchLength: MIN_SEARCH_LENGTH,
  });

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
    });
    return () => unsub();
  }, [tm.dateRange]);

  const displayData = useMemo(
    () => applyQuickFilters(tm.paginatedData, activeQuickFilters),
    [tm.paginatedData, activeQuickFilters]
  );

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
      week: { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) },
      month: { from: startOfMonth(now), to: endOfMonth(now) },
      lastMonth: { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
    };
    tm.onDateRangeChange(ranges[p]);
  };

  const handleExport = () => {
    if (!tm.fullFilteredData.length) {
      toast({ title: "Sin datos para exportar", variant: "destructive" });
      return;
    }
    const rows = tm.fullFilteredData.map((s) => {
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

  return (
    <div className="space-y-4">
      <HistorySummary filteredServices={tm.fullFilteredData} />

      {/* Filters Row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
          <div className="relative w-full xl:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Buscar (mín. ${MIN_SEARCH_LENGTH} caracteres)...`}
              value={tm.searchTerm}
              onChange={(e) => tm.onSearchTermChange(e.target.value)}
              className="h-10 bg-background pl-9 pr-8"
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
          <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1">
            <DatePickerWithRange date={tm.dateRange} onDateChange={tm.onDateRangeChange} />
            {(["today", "week", "month", "lastMonth"] as const).map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                onClick={() => setPreset(p)}
                className="whitespace-nowrap bg-background text-xs h-9"
              >
                {p === "today" ? "Hoy" : p === "week" ? "Esta semana" : p === "month" ? "Este mes" : "Mes pasado"}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="h-10 bg-background border-primary text-primary hover:bg-primary/5 shrink-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Filtros rápidos:
          </span>
          {QUICK_FILTERS.map(({ id, label, icon: Ico, color }) => {
            const isActive = activeQuickFilters.has(id);
            return (
              <button
                key={id}
                data-active={isActive}
                onClick={() => toggleFilter(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  color
                )}
              >
                <Ico className="h-3.5 w-3.5" />
                {label}
                {isActive && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
          {activeQuickFilters.size > 0 && (
            <button
              onClick={() => setActiveQuickFilters(new Set())}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Status + Sort */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={tm.otherFilters["status"] || "all"}
            onValueChange={(v) => tm.setOtherFilters({ ...tm.otherFilters, status: v })}
          >
            <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Entregado">Entregado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tm.sortOption} onValueChange={tm.onSortOptionChange}>
            <SelectTrigger className="h-10 w-full sm:w-[200px] bg-background">
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
        </div>
      </div>

      {/* Pagination Header */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {tm.isSearchActive
            ? `${tm.fullFilteredData.length} resultados`
            : tm.paginationSummary}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={tm.goToPreviousPage} disabled={!tm.canGoPrevious} className="bg-background">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" variant="outline" onClick={tm.goToNextPage} disabled={!tm.canGoNext} className="bg-background">
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
