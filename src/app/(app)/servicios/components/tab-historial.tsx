
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
  Wrench,
  DollarSign,
  Wallet,
  CreditCard,
  Landmark,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { calcEffectiveProfit } from "@/lib/money-helpers";
import { exportToCsv } from "@/lib/services/export.service";
import { HistorialSummary } from "./HistorialSummary";
import type { ServiceRecord, Vehicle, User, Payment, PaymentMethod } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "./ServiceAppointmentCard";
import { startOfMonth, endOfMonth } from "date-fns";

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
];

const sortOptions = [
  { value: "deliveryDateTime_desc", label: "Fecha (Más Reciente)" },
  { value: "deliveryDateTime_asc", label: "Fecha (Más Antiguo)" },
  { value: "totalCost_desc", label: "Costo (Mayor a Menor)" },
  { value: "totalCost_asc", label: "Costo (Menor a Menor)" },
  { value: "vehicleIdentifier_asc", label: "Placa (A-Z)" },
];

// helpers locales
const toNumber = (v: unknown) => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};
const fmtLocal = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-MX') : '';

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

  const vehiclesMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const personnelMap = useMemo(() => {
    const m = new Map<string, User>();
    personnel.forEach((p) => m.set(p.id!, p));
    return m;
  }, [personnel]);

  const historicalServices = useMemo(
    () => services.filter((s) => s.status === "Entregado" || s.status === "Cancelado"),
    [services]
  );

  const defaultRange = useMemo(
    () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    []
  );

  const { paginatedData, fullFilteredData, ...tableManager } =
    useTableManager<ServiceRecord>({
      initialData: historicalServices,
      searchKeys: [
        "id",
        "folio",
        "vehicleIdentifier",
        "customerName",
        "description",
        "serviceItems.name",
        "suppliesUsed.supplyName",
      ],
      dateFilterKey: "deliveryDateTime",
      initialSortOption: "deliveryDateTime_desc",
      initialDateRange: defaultRange,
      itemsPerPage: 50,
    });

  // ——— EXPORTACIÓN CSV: “profesional”
  const handleExport = () => {
    const data = fullFilteredData;
    if (!data.length) {
      toast({
        title: "No hay datos para exportar",
        description: "Intenta cambiar los filtros para incluir más resultados.",
        variant: "destructive",
      });
      return;
    }

    const rows = data.map((s) => {
      const v = vehiclesMap.get((s as any).vehicleId || "");
      const payments = Array.isArray(s.payments) ? s.payments : [];
      const customerTotal =
        payments.length > 0
          ? payments.reduce((a, p) => a + toNumber(p.amount), 0)
          : toNumber((s as any).total ?? (s as any).totalCost ?? 0);

      const metodoPago =
        payments.length > 0
          ? Array.from(new Set(payments.map((p) => p.method))).join(" / ")
          : ((s as any).paymentMethod as string) || "";

      // técnico por id si no hay nombre
      const technicianName =
        (s as any).technicianName ||
        (s as any).technician_id_name ||
        (s as any).technician ||
        ((s as any).technicianId
          ? personnelMap.get((s as any).technicianId)?.name || ""
          : "");

      // insumos (no servicios)
      const supplies = Array.isArray((s as any).suppliesUsed)
        ? (s as any).suppliesUsed.filter((i: any) => !i.isService)
        : [];

      const insumosLista = supplies.map(
        (i: any) => `${(i.supplyName || i.name || "").trim()} x${i.quantity ?? 1}`
      );
      const insumosCostoUnitario = supplies.map((i: any) => toNumber(i.unitPrice));
      const insumosPrecioUnitario = supplies.map((i: any) => toNumber(i.sellingPrice));
      const insumosSubtotalCosto = supplies.map(
        (i: any) => toNumber(i.unitPrice) * (i.quantity ?? 1)
      );
      const insumosSubtotalVenta = supplies.map(
        (i: any) => toNumber(i.sellingPrice) * (i.quantity ?? 1)
      );
      const insumosCostoTotal = insumosSubtotalCosto.reduce((a, b) => a + b, 0);
      const insumosVentaTotal = insumosSubtotalVenta.reduce((a, b) => a + b, 0);

      return {
        id: (s as any).id,
        folio: (s as any).folio || "",
        fechaEntrega:
          fmtLocal((s as any).deliveryDateTime) ||
          fmtLocal((s as any).serviceDate) ||
          fmtLocal((s as any).receptionDateTime),
        estado: (s as any).status,
        subEstado: (s as any).subStatus || "",

        // Quién hizo el servicio
        asesor: (s as any).serviceAdvisorName || "",
        tecnico: technicianName,

        // Cliente
        cliente: (s as any).customerName || "",
        telefono: (s as any).customerPhone || "",

        // Vehículo
        vehicle: {
          licensePlate: v?.licensePlate || (s as any).vehicleIdentifier || "",
          make: (v as any)?.make || (v as any)?.brand || "",
          model: (v as any)?.model || "",
          year: (v as any)?.year || "",
          color: (v as any)?.color || "",
          ownerName: (v as any)?.ownerName || "",
        },

        metodoPago,
        costoCliente: customerTotal,
        ganancia: calcEffectiveProfit(s),

        itemsServicio: Array.isArray((s as any).serviceItems)
          ? (s as any).serviceItems.map((i: any) => i.name)
          : [],

        // Insumos
        insumosLista,
        insumosCostoUnitario,
        insumosSubtotalCosto,
        insumosCostoTotal,
        insumosPrecioUnitario,
        insumosSubtotalVenta,
        insumosVentaTotal,

        // Otros
        iva: (s as any).iva ?? "",
        notas: (s as any).notes ?? "",
      };
    });

    const headers = [
      { key: "folio", label: "Folio" },
      { key: "fechaEntrega", label: "Fecha Entrega" },
      { key: "estado", label: "Estado" },
      { key: "subEstado", label: "Sub-Estado" },

      // Quién hizo el servicio
      { key: "asesor", label: "Asesor (Quien Atendió)" },
      { key: "tecnico", label: "Técnico" },

      // Cliente
      { key: "cliente", label: "Cliente" },
      { key: "telefono", label: "Teléfono" },

      // Vehículo
      { key: "vehicle.licensePlate", label: "Placas" },
      { key: "vehicle.make", label: "Marca" },
      { key: "vehicle.model", label: "Modelo" },
      { key: "vehicle.year", label: "Año" },
      { key: "vehicle.color", label: "Color" },
      { key: "vehicle.ownerName", label: "Propietario" },

      // Montos
      { key: "metodoPago", label: "Método(s) de Pago" },
      { key: "costoCliente", label: "Costo Cliente" },
      { key: "ganancia", label: "Ganancia" },

      // Servicio & insumos
      { key: "itemsServicio", label: "Servicios (Items)" },
      { key: "insumosLista", label: "Insumos (Nombre x Cantidad)" },
      { key: "insumosCostoUnitario", label: "Costo Unitario por Insumo" },
      { key: "insumosSubtotalCosto", label: "Subtotal Costo por Insumo" },
      { key: "insumosCostoTotal", label: "Costo Total Insumos" },
      { key: "insumosPrecioUnitario", label: "Precio Venta Unitario por Insumo" },
      { key: "insumosSubtotalVenta", label: "Subtotal Venta por Insumo" },
      { key: "insumosVentaTotal", label: "Venta Total Insumos" },

      // Otros
      { key: "iva", label: "IVA" },
      { key: "notas", label: "Notas" },
      { key: "id", label: "ID Servicio" },
    ];

    exportToCsv({
      data: rows,
      headers,
      fileName: "historial_servicios",
    });
  };

  const handleEditService = useCallback((serviceId: string) => router.push(`/servicios/${serviceId}`), [router]);

  const renderServiceCard = useCallback(
    (record: ServiceRecord) => (
      <ServiceAppointmentCard
        key={record.id}
        service={record}
        vehicle={vehicles.find((v) => v.id === (record as any).vehicleId)}
        personnel={personnel}
        currentUser={currentUser}
        onEdit={() => handleEditService(record.id)}
        onView={() => onShowShareDialog(record)}
        onDelete={() => onDelete(record.id)}
        onShowTicket={() => onShowTicket(record)}
      />
    ),
    [vehicles, personnel, currentUser, onShowShareDialog, onDelete, onShowTicket, handleEditService]
  );

  return (
    <div className="space-y-4">
      {/* Resumen factorado */}
      <HistorialSummary filteredServices={fullFilteredData} />

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Input
            placeholder="Buscar por folio, placa..."
            value={tableManager.searchTerm}
            onChange={(event) => tableManager.onSearchTermChange(event.target.value)}
            className="h-10 w-full lg:w-[250px] bg-white"
          />
          <DatePickerWithRange
            date={tableManager.dateRange}
            onDateChange={tableManager.onDateRangeChange}
          />
          <Button onClick={handleExport} variant="outline" className="h-10 bg-white">
            <Download className="h-4 w-4 mr-2" />
            Exportar a CSV
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Select
            value={tableManager.otherFilters["status"] || "all"}
            onValueChange={(value) =>
              tableManager.setOtherFilters({ ...tableManager.otherFilters, status: value })
            }
          >
            <SelectTrigger className="h-10 w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {serviceStatusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tableManager.otherFilters["paymentMethod"] || "all"}
            onValueChange={(value) =>
              tableManager.setOtherFilters({ ...tableManager.otherFilters, paymentMethod: value })
            }
          >
            <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Método de Pago" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tableManager.sortOption} onValueChange={tableManager.onSortOptionChange}>
            <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista / Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={tableManager.goToPreviousPage}
            disabled={!tableManager.canGoPrevious}
            variant="outline"
            className="bg-card border-gray-300"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            size="sm"
            onClick={tableManager.goToNextPage}
            disabled={!tableManager.canGoNext}
            variant="outline"
            className="bg-card border-gray-300"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {paginatedData.length > 0 ? (
        <div className="space-y-4">{paginatedData.map(renderServiceCard)}</div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mb-2" />
          <h3 className="text-lg font-semibold text-foreground">No se encontraron registros</h3>
          <p className="text-sm">Intente cambiar su búsqueda o el rango de fechas.</p>
        </div>
      )}
    </div>
  );
}
