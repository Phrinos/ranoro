
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
import type { ServiceRecord, Vehicle, User, Payment, PaymentMethod } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "./ServiceAppointmentCard";
import { startOfMonth, endOfMonth } from "date-fns";
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
import { exportToCsv } from "@/lib/services/export.service"; // <— usa tu helper

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

const paymentMethodIcons: Record<Payment["method"], React.ElementType> = {
  Efectivo: Wallet,
  Tarjeta: CreditCard,
  "Tarjeta MSI": CreditCard,
  Transferencia: Landmark,
};

// Helpers locales
const toNumber = (v: unknown) => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};
const fmtLocal = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX") : "";

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

  const historicalServices = useMemo(
    () => services.filter((s) => s.status === "Entregado" || s.status === "Cancelado"),
    [services]
  );

  const defaultRange = useMemo(
    () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    []
  );

  const { paginatedData, fullFilteredData, ...tableManager } = useTableManager<ServiceRecord>({
    initialData: historicalServices,
    searchKeys: ["id", "folio", "vehicleIdentifier", "description", "serviceItems.name"],
    dateFilterKey: "deliveryDateTime",
    initialSortOption: "deliveryDateTime_desc",
    initialDateRange: defaultRange,
    itemsPerPage: 50,
  });

  // —— Resumen (ingresos por pagos, ya considerando Efectivo/Transferencia/Tarjeta/Tarjeta MSI)
  const summaryData = useMemo(() => {
    const deliveredServices = fullFilteredData.filter((s) => s.status === "Entregado");
    const servicesCount = deliveredServices.length;

    const getServiceRevenue = (s: ServiceRecord) => {
      if (Array.isArray(s.payments) && s.payments.length > 0) {
        return s.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
      }
      // compat: total / totalCost / customerTotal
      return toNumber((s as any).total ?? (s as any).totalCost ?? (s as any).customerTotal ?? 0);
    };

    let totalRevenue = 0;
    const paymentsSummary = new Map<Payment["method"], { count: number; total: number }>();

    deliveredServices.forEach((s) => {
      const revenue = getServiceRevenue(s);
      totalRevenue += revenue;

      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p) => {
          const key = p.method as Payment["method"];
          const amt = toNumber(p.amount);
          const current = paymentsSummary.get(key) || { count: 0, total: 0 };
          current.count += 1;
          current.total += amt;
          paymentsSummary.set(key, current);
        });
      } else if ((s as any).paymentMethod) {
        const key = (s as any).paymentMethod as Payment["method"];
        const current = paymentsSummary.get(key) || { count: 0, total: 0 };
        current.count += 1;
        current.total += revenue;
        paymentsSummary.set(key, current);
      }
    });

    const totalProfit = deliveredServices.reduce(
      (sum, s) => sum + calcEffectiveProfit(s),
      0
    );

    return { servicesCount, totalRevenue, totalProfit, paymentsSummary };
  }, [fullFilteredData]);

  const handleEditService = (serviceId: string) => {
    router.push(`/servicios/${serviceId}`);
  };

  // —— EXPORTACIÓN CSV: “profesional”
  const handleExport = () => {
    const data = fullFilteredData; // exporta lo filtrado (incluye Entregado/Cancelado)
    if (!data.length) {
      toast({
        title: "No hay datos para exportar",
        description: "Intenta cambiar los filtros para incluir más resultados.",
        variant: "destructive",
      });
      return;
    }

    // Construimos filas con campos calculados y anidamos vehículo para usar keys tipo "vehicle.licensePlate"
    const rows = data.map((s) => {
      const v = vehiclesMap.get((s as any).vehicleId || "");
      const payments = Array.isArray(s.payments) ? s.payments : [];
      const customerTotal =
        payments.length > 0
          ? payments.reduce((a, p) => a + toNumber(p.amount), 0)
          : toNumber((s as any).total ?? (s as any).totalCost ?? 0);

      const methodStr =
        payments.length > 0
          ? Array.from(new Set(payments.map((p) => p.method))).join(" / ")
          : ((s as any).paymentMethod as string) || "";

      // Insumos (no servicios)
      const supplies = Array.isArray((s as any).suppliesUsed)
        ? (s as any).suppliesUsed.filter((i: any) => !i.isService)
        : [];

      const insumosLista = supplies.map((i: any) => `${(i.supplyName || i.name || "").trim()} x${i.quantity ?? 1}`);
      const costoUnitario = supplies.map((i: any) => toNumber(i.unitPrice));
      const precioUnitario = supplies.map((i: any) => toNumber(i.sellingPrice));
      const subtotalCosto = supplies.map((i: any) => toNumber(i.unitPrice) * (i.quantity ?? 1));
      const subtotalVenta = supplies.map((i: any) => toNumber(i.sellingPrice) * (i.quantity ?? 1));
      const costoTotalInsumos = subtotalCosto.reduce((a: number, b: number) => a + b, 0);
      const ventaTotalInsumos = subtotalVenta.reduce((a: number, b: number) => a + b, 0);

      return {
        id: (s as any).id,
        folio: (s as any).folio || "",
        fechaEntrega: fmtLocal((s as any).deliveryDateTime) || fmtLocal((s as any).serviceDate) || fmtLocal((s as any).receptionDateTime),
        estado: (s as any).status,
        subEstado: (s as any).subStatus || "",
        asesor: (s as any).serviceAdvisorName || "",
        tecnico: (s as any).technicianName || "",

        cliente: (s as any).clientName || "",
        telefono: (s as any).clientPhoneNumber || "",

        vehicle: {
          licensePlate: v?.licensePlate || (s as any).vehicleIdentifier || "",
          make: (v as any)?.make || (v as any)?.brand || "",
          model: (v as any)?.model || "",
          year: (v as any)?.year || "",
          color: (v as any)?.color || "",
          ownerName: (v as any)?.ownerName || "",
        },

        metodoPago: methodStr,
        costoCliente: customerTotal,
        ganancia: calcEffectiveProfit(s),

        itemsServicio: Array.isArray((s as any).serviceItems)
          ? (s as any).serviceItems.map((i: any) => i.name)
          : [],

        insumosLista,                    // "Nombre x Cantidad"
        insumosCostoUnitario: costoUnitario,
        insumosPrecioUnitario: precioUnitario,
        insumosSubtotalCosto: subtotalCosto,
        insumosSubtotalVenta: subtotalVenta,
        insumosCostoTotal: costoTotalInsumos,
        insumosVentaTotal: ventaTotalInsumos,

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

      // Cliente (opcional)
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
    [vehicles, personnel, currentUser, onShowShareDialog, onDelete, onShowTicket]
  );

  return (
    <div className="space-y-4">
      {/* Resumen superior */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios en Periodo</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.servicesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Periodo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Ganancia: {formatCurrency(summaryData.totalProfit)}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos por Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.from(summaryData.paymentsSummary.entries()).length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {Array.from(summaryData.paymentsSummary.entries()).map(([method, data]) => {
                  const Icon =
                    paymentMethodIcons[method as keyof typeof paymentMethodIcons] || Wallet;
                  let variant: "lightGreen" | "lightPurple" | "blue" | "secondary" = "secondary";
                  if (method === "Efectivo") variant = "lightGreen";
                  if (method.includes("Tarjeta")) variant = "lightPurple";
                  if (method === "Transferencia") variant = "blue";
                  return (
                    <Badge key={method} variant={variant} className="text-sm">
                      <Icon className="h-3 w-3 mr-1" />
                      {method}: <span className="font-semibold ml-1">{formatCurrency(data.total)}</span>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay pagos registrados en este periodo.</p>
            )}
          </CardContent>
        </Card>
      </div>

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
              {serviceStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
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
              {paymentMethodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tableManager.sortOption} onValueChange={tableManager.onSortOptionChange}>
            <SelectTrigger className="h-10 w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards */}
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
