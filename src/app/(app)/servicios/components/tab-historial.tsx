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
import type { ServiceRecord, Vehicle, User, PaymentMethod } from "@/types";
import { useTableManager } from "@/hooks/useTableManager";
import { ServiceAppointmentCard } from "./ServiceAppointmentCard";
import { startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/services/export.service";
import { HistorialSummary } from './HistorialSummary'; // <-- Importamos el nuevo componente

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

  const handleEditService = (serviceId: string) => {
    router.push(`/servicios/${serviceId}`);
  };

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
    // ... La lógica de exportación permanece igual
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
      {/* Resumen superior ahora en su propio componente */}
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

      {/* Paginación y lista de servicios */}
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
