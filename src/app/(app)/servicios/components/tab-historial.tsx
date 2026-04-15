
// src/app/(app)/servicios/components/tab-historial.tsx
"use client";

import React, { useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { calcEffectiveProfit, calcSuppliesCostFromItems } from "@/lib/money-helpers";
import { exportToCsv } from "@/lib/services/export.service";
import { HistorialSummary } from "./HistorialSummary";
import type { ServiceRecord, Vehicle, User, PaymentMethod } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "./ServiceAppointmentCard";
import { isValid, format as formatFns, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from '@/lib/forms';
import { serviceService } from "@/lib/services";
import { cn } from "@/lib/utils";

interface HistorialTabContentProps {
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onShowShareDialog: (service: ServiceRecord) => void;
  onDelete: (serviceId: string) => void;
  onShowTicket: (service: ServiceRecord) => void;
}

const serviceStatusOptions: { value: ServiceRecord["status"] | "all"; label: string }[] = [
  { value: "all", label: "Todos los Estados" },
  { value: "Entregado", label: "Entregado" },
  { value: "Cancelado", label: "Cancelado" },
];

const paymentMethodOptions: { value: PaymentMethod | "all"; label: string }[] = [
  { value: "all", label: "Todos los Métodos" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Tarjeta 3 MSI", label: "Tarjeta 3 MSI" },
  { value: "Tarjeta 6 MSI", label: "Tarjeta 6 MSI" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Transferencia/Contadora", label: "Transferencia/Contadora" },
];

const sortOptions = [
  { value: "folio_desc", label: "Folio (Más Reciente)" },
  { value: "folio_asc", label: "Folio (Más Antiguo)" },
  { value: "deliveryDateTime_desc", label: "Fecha (Más Reciente)" },
  { value: "deliveryDateTime_asc", label: "Fecha (Más Antiguo)" },
  { value: "totalCost_desc", label: "Costo (Mayor a Menor)" },
  { value: "totalCost_asc", label: "Costo (Menor a Mayor)" },
  { value: "vehicleIdentifier_asc", label: "Placa (A-Z)" },
];

// Quick filter definitions
type QuickFilter = "sin-tecnico" | "sin-cobrar" | "sin-insumos" | "cancelados";

const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ElementType; color: string }[] = [
  { id: "sin-tecnico", label: "Sin Técnico", icon: UserX, color: "text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100 data-[active=true]:bg-orange-500 data-[active=true]:text-white data-[active=true]:border-orange-500" },
  { id: "sin-cobrar", label: "Sin Cobrar", icon: DollarSign, color: "text-red-600 border-red-300 bg-red-50 hover:bg-red-100 data-[active=true]:bg-red-500 data-[active=true]:text-white data-[active=true]:border-red-500" },
  { id: "sin-insumos", label: "Sin Insumos", icon: Package, color: "text-purple-600 border-purple-300 bg-purple-50 hover:bg-purple-100 data-[active=true]:bg-purple-500 data-[active=true]:text-white data-[active=true]:border-purple-500" },
  { id: "cancelados", label: "Cancelados", icon: XCircle, color: "text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100 data-[active=true]:bg-gray-600 data-[active=true]:text-white data-[active=true]:border-gray-600" },
];

const MIN_SEARCH_LENGTH = 6;

const toNumber = (v: unknown) => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = parseDate(iso);
  return d && isValid(d) ? formatFns(d, "dd/MM/yyyy HH:mm", { locale: es }) : "";
};

function applyQuickFilters(data: ServiceRecord[], activeFilters: Set<QuickFilter>): ServiceRecord[] {
  if (activeFilters.size === 0) return data;

  return data.filter(s => {
    for (const filter of activeFilters) {
      switch (filter) {
        case "sin-tecnico":
          if (s.technicianId || s.technicianName) return false;
          break;
        case "sin-cobrar": {
          const hasPayments = Array.isArray(s.payments) && s.payments.length > 0;
          const hasTotal = toNumber(s.totalCost) > 0;
          if (hasPayments || hasTotal) return false;
          break;
        }
        case "sin-insumos": {
          const hasInsumos = s.serviceItems?.some(item =>
            Array.isArray(item.suppliesUsed) && item.suppliesUsed.length > 0
          );
          if (hasInsumos) return false;
          break;
        }
        case "cancelados":
          if (s.status !== "Cancelado") return false;
          break;
      }
    }
    return true;
  });
}

export default function HistorialTabContent({
  vehicles,
  personnel,
  currentUser,
  onShowShareDialog,
  onDelete,
  onShowTicket,
}: HistorialTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeQuickFilters, setActiveQuickFilters] = React.useState<Set<QuickFilter>>(new Set());

  const [remoteServices, setRemoteServices] = React.useState<ServiceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  // Initial range: Current Month
  const initialRange = React.useMemo(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }), []);

  const tableManager = useTableManager<ServiceRecord>({
    initialData: remoteServices,
    searchKeys: [
      "id",
      "folio",
      "vehicleIdentifier",
      "customerName",
      "description",
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

  React.useEffect(() => {
    const range = tableManager.dateRange;
    if (!range?.from) return;

    setIsLoadingHistory(true);
    const startIso = startOfDay(range.from).toISOString();
    const endIso = range.to ? endOfDay(range.to).toISOString() : endOfDay(range.from).toISOString();

    const unsub = serviceService.onHistoricalServicesUpdate(startIso, endIso, (data) => {
      setRemoteServices(data);
      setIsLoadingHistory(false);
    });

    return () => unsub();
  }, [tableManager.dateRange]);

  // Apply quick filters on top of the table manager's output
  const displayData = useMemo(
    () => applyQuickFilters(tableManager.paginatedData, activeQuickFilters),
    [tableManager.paginatedData, activeQuickFilters]
  );

  const toggleQuickFilter = (id: QuickFilter) => {
    setActiveQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setPresetDate = (preset: "today" | "week" | "month" | "lastMonth") => {
    const now = new Date();
    let range = { from: now, to: now };
    switch (preset) {
      case "today":
        range = { from: startOfDay(now), to: endOfDay(now) };
        break;
      case "week":
        range = { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
        break;
      case "month":
        range = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "lastMonth": {
        const lm = subMonths(now, 1);
        range = { from: startOfMonth(lm), to: endOfMonth(lm) };
        break;
      }
    }
    tableManager.onDateRangeChange(range);
  };

  const handleExport = () => {
    if (tableManager.fullFilteredData.length === 0) {
      toast({ title: "No hay datos para exportar", variant: "destructive" });
      return;
    }

    const rows = tableManager.fullFilteredData.map((s) => {
      const v = vehicles.find((veh) => veh.id === s.vehicleId);
      const totalCost = toNumber(s.totalCost || (s as any).total || 0);
      const profit = calcEffectiveProfit(s);
      const suppliesCost = calcSuppliesCostFromItems(s.serviceItems);

      const paymentMethod = s.payments?.length
        ? Array.from(new Set(s.payments.map(p => p.method))).join(" / ")
        : (s as any).paymentMethod || "N/A";

      return {
        folio: s.folio || s.id.slice(-6),
        fecha: fmtDate(s.deliveryDateTime || s.serviceDate),
        cliente: s.customerName || "N/A",
        telefono: s.customerPhone || "N/A",
        vehiculo: s.vehicleIdentifier || "N/A",
        placas: v?.licensePlate || "N/A",
        trabajos: s.serviceItems.map(it => it.name).join("; "),
        metodo_pago: paymentMethod,
        total_cliente: totalCost,
        costo_insumos: suppliesCost,
        comision_banco: toNumber(s.cardCommission),
        ganancia_real: profit,
        asesor: s.serviceAdvisorName || "N/A",
        tecnico: s.technicianName || "N/A",
        estatus: s.status,
        notas: s.notes || "",
      };
    });

    const headers = [
      { key: "folio", label: "Folio" },
      { key: "fecha", label: "Fecha Entrega" },
      { key: "cliente", label: "Cliente" },
      { key: "telefono", label: "Teléfono" },
      { key: "vehiculo", label: "Vehículo" },
      { key: "placas", label: "Placas" },
      { key: "trabajos", label: "Servicios Realizados" },
      { key: "metodo_pago", label: "Método de Pago" },
      { key: "total_cliente", label: "Total Cobrado" },
      { key: "costo_insumos", label: "Costo Insumos" },
      { key: "comision_banco", label: "Comisión Bancaria" },
      { key: "ganancia_real", label: "Ganancia Real" },
      { key: "asesor", label: "Asesor" },
      { key: "tecnico", label: "Técnico" },
      { key: "estatus", label: "Estatus" },
      { key: "notas", label: "Notas" },
    ];

    exportToCsv({
      data: rows,
      headers,
      fileName: "historial_servicios_detallado",
    });
  };

  const handleEditService = useCallback((serviceId: string) => router.push(`/servicios/${serviceId}`), [router]);

  const hasActiveFilters = activeQuickFilters.size > 0;
  const searchIsShort = tableManager.searchTerm.length > 0 && !tableManager.isSearchActive;

  return (
    <div className="space-y-4">
      <HistorialSummary filteredServices={tableManager.fullFilteredData} />

      <div className="flex flex-col gap-4">
        {/* Row 1: Search + date presets + export */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
          <div className="relative w-full xl:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Buscar (mín. ${MIN_SEARCH_LENGTH} caracteres)...`}
              value={tableManager.searchTerm}
              onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
              className="h-10 bg-white pl-9 pr-8"
            />
            {tableManager.searchTerm && (
              <button
                onClick={() => tableManager.onSearchTermChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchIsShort && (
            <p className="text-xs text-amber-600 font-medium -mt-1 xl:mt-0">
              Escribe al menos {MIN_SEARCH_LENGTH} caracteres para buscar en todos los registros
            </p>
          )}
          <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
            <DatePickerWithRange
              date={tableManager.dateRange}
              onDateChange={tableManager.onDateRangeChange}
            />
            <Button variant="outline" size="sm" onClick={() => setPresetDate('today')} className="whitespace-nowrap bg-white text-xs h-9">Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => setPresetDate('week')} className="whitespace-nowrap bg-white text-xs h-9">Esta semana</Button>
            <Button variant="outline" size="sm" onClick={() => setPresetDate('month')} className="whitespace-nowrap bg-white text-xs h-9">Este mes</Button>
            <Button variant="outline" size="sm" onClick={() => setPresetDate('lastMonth')} className="whitespace-nowrap bg-white text-xs h-9">Mes pasado</Button>
          </div>
          <Button onClick={handleExport} variant="outline" className="h-10 bg-white border-primary text-primary hover:bg-primary/5 shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Exportar Detallado
          </Button>
        </div>

        {/* Row 2: Quick filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtros rápidos:</span>
          {QUICK_FILTERS.map(({ id, label, icon: Icon, color }) => {
            const isActive = activeQuickFilters.has(id);
            return (
              <button
                key={id}
                data-active={isActive}
                onClick={() => toggleQuickFilter(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  color
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {isActive && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
          {hasActiveFilters && (
            <button
              onClick={() => setActiveQuickFilters(new Set())}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Row 3: Selects for status, payment method, sort */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Select
            value={tableManager.otherFilters["status"] || "all"}
            onValueChange={(v) => tableManager.setOtherFilters({ ...tableManager.otherFilters, status: v })}
          >
            <SelectTrigger className="h-10 w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {serviceStatusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tableManager.otherFilters["payments.method"] || "all"}
            onValueChange={(v) => tableManager.setOtherFilters({ ...tableManager.otherFilters, "payments.method": v })}
          >
            <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Método de Pago" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tableManager.sortOption} onValueChange={tableManager.onSortOptionChange}>
            <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {tableManager.isSearchActive
            ? `${tableManager.fullFilteredData.length} resultados en toda la base de datos`
            : tableManager.paginationSummary}
        </p>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isLoadingHistory && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center border rounded-lg">
             <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
             <span className="text-muted-foreground font-medium animate-pulse">Sincronizando registros históricos...</span>
          </div>
        )}
        <div className="space-y-4">
          {displayData.length > 0 ? (
            displayData.map((record) => (
              <ServiceAppointmentCard
                key={record.id}
                service={record}
                vehicle={vehicles.find((v) => v.id === record.vehicleId)}
                personnel={personnel}
                currentUser={currentUser}
                onEdit={() => handleEditService(record.id)}
                onView={() => onShowShareDialog(record)}
                onDelete={() => onDelete(record.id)}
                onShowTicket={() => onShowTicket(record)}
              />
            ))
          ) : (
            !isLoadingHistory && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-card/50">
                <FileText className="h-12 w-12 mb-3 opacity-20" />
                <h3 className="text-lg font-semibold text-foreground">
                  {hasActiveFilters || tableManager.isSearchActive
                    ? "No hay resultados con los filtros aplicados"
                    : "No hay registros históricos en este periodo"}
                </h3>
                <p className="text-sm">
                  {hasActiveFilters || tableManager.isSearchActive
                    ? "Prueba a quitar algún filtro o cambiar la búsqueda."
                    : "Ajusta las fechas o realiza una búsqueda para ver resultados."}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
