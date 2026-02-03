
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
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { calcEffectiveProfit, calcSuppliesCostFromItems } from "@/lib/money-helpers";
import { exportToCsv } from "@/lib/services/export.service";
import { HistorialSummary } from "./HistorialSummary";
import type { ServiceRecord, Vehicle, User, PaymentMethod } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "./ServiceAppointmentCard";
import { isValid, format as formatFns } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from '@/lib/forms';

interface HistorialTabContentProps {
  services: ServiceRecord[];
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
  { value: "Tarjeta MSI", label: "Tarjeta MSI" },
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

export default function HistorialTabContent({
  services,
  vehicles,
  personnel,
  currentUser,
  onShowShareDialog,
  onDelete,
  onShowTicket,
}: HistorialTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const historicalServices = useMemo(
    () => services.filter((s) => s.status === "Entregado" || s.status === "Cancelado"),
    [services]
  );

  const tableManager = useTableManager<ServiceRecord>({
    initialData: historicalServices,
    searchKeys: [
      "id",
      "folio",
      "vehicleIdentifier",
      "customerName",
      "description",
      "serviceItems.name",
    ],
    dateFilterKey: (item) => parseDate(item.deliveryDateTime || item.serviceDate), 
    initialSortOption: "folio_desc",
    itemsPerPage: 10,
  });

  const { paginatedData, fullFilteredData } = tableManager;

  const handleExport = () => {
    if (fullFilteredData.length === 0) {
      toast({ title: "No hay datos para exportar", variant: "destructive" });
      return;
    }

    const rows = fullFilteredData.map((s) => {
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

  return (
    <div className="space-y-4">
      <HistorialSummary filteredServices={fullFilteredData} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full lg:w-[300px]">
            <Input
              placeholder="Buscar folio, placa o cliente..."
              value={tableManager.searchTerm}
              onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
              className="h-10 bg-white"
            />
          </div>
          <DatePickerWithRange
            date={tableManager.dateRange}
            onDateChange={tableManager.onDateRangeChange}
          />
          <Button onClick={handleExport} variant="outline" className="h-10 bg-white border-primary text-primary hover:bg-primary/5">
            <Download className="h-4 w-4 mr-2" />
            Exportar Detallado
          </Button>
        </div>

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
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tableManager.paginationSummary}</p>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedData.length > 0 ? (
          paginatedData.map((record) => (
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
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-card/50">
            <FileText className="h-12 w-12 mb-3 opacity-20" />
            <h3 className="text-lg font-semibold text-foreground">No hay registros históricos</h3>
            <p className="text-sm">Ajusta los filtros o realiza una búsqueda para ver resultados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
