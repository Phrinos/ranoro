
// src/app/(app)/vehiculos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Loader2, Edit } from "lucide-react";
import { inventoryService, serviceService } from "@/lib/services";
import type { Vehicle, ServiceRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { VehicleInfoCard } from "../components/VehicleInfoCard";
import { VehicleDialog } from "../components/vehicle-dialog";
import type { VehicleFormValues } from "@/schemas/vehicle-form-schema";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import { formatNumber, formatCurrency, getStatusInfo } from "@/lib/utils";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { useTableManager } from "@/hooks/useTableManager";
import { MaintenanceCard } from "../../vehiculos/components/MaintenanceCard";
import { VehiclePricingCard } from "../../precios/components/VehiclePricingCard";
import type { EngineData } from "@/lib/data/vehicle-database-types";
import { EditEngineDataDialog } from "@/app/(app)/precios/components/EditEngineDataDialog";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { VEHICLE_COLLECTION } from "@/lib/vehicle-constants";

const getServiceDescriptionText = (service: ServiceRecord) => {
  if (service.serviceItems && service.serviceItems.length > 0) {
    return service.serviceItems.map((item) => item.name).join(", ");
  }
  return service.description;
};

function ServiceHistoryTable({
  services,
  onRowClick,
}: {
  services: ServiceRecord[];
  onRowClick: (service: ServiceRecord) => void;
}) {
  const { filteredData: sortedServices, sortOption, onSortOptionChange } =
    useTableManager<ServiceRecord>({
      initialData: services,
      searchKeys: [],
      dateFilterKey: "serviceDate",
      initialSortOption: "folio_desc",
    });

  const handleSort = (key: string) => {
    const isAsc = sortOption.endsWith("_asc");
    onSortOptionChange(`${key}_${isAsc ? "desc" : "asc"}`);
  };

  const formatRelevantDate = (service: ServiceRecord) => {
    const relevantDate = parseDate(
      service.deliveryDateTime || service.receptionDateTime || service.serviceDate
    );
    return relevantDate && isValid(relevantDate)
      ? format(relevantDate, "dd MMM yyyy, HH:mm", { locale: es })
      : "N/A";
  };

  const renderMobileCards = () => (
    <div className="space-y-3">
      {sortedServices.map((service) => {
        const statusInfo = getStatusInfo(service.status as any);
        const folio = service.folio || service.id.slice(-6);
        const dateText = formatRelevantDate(service);
        const mileageText = (service as any).mileage
          ? `${formatNumber((service as any).mileage)} km`
          : "N/A";
        const desc = getServiceDescriptionText(service);

        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onRowClick(service)}
            className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 active:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {folio}
                  </span>
                  <Badge variant={statusInfo.color as any} className="shrink-0">
                    {service.status}
                  </Badge>
                </div>
                <div className="mt-1 text-sm font-medium">
                  {vehicleSafeText(desc)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold">
                  {formatCurrency(service.totalCost || 0)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {mileageText}
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              {dateText}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderDesktopTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[880px]">
        <TableHeader className="bg-black">
          <TableRow>
            <SortableTableHeader
              sortKey="folio"
              label="Folio"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="serviceDate"
              label="Fecha"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="mileage"
              label="Kilometraje"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="description"
              label="Descripción"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
            <SortableTableHeader
              sortKey="totalCost"
              label="Costo"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
              className="text-right"
            />
            <SortableTableHeader
              sortKey="status"
              label="Estado"
              onSort={handleSort}
              currentSort={sortOption}
              textClassName="text-white"
            />
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedServices.map((service) => {
            const statusInfo = getStatusInfo(service.status as any);
            const relevantDate = formatRelevantDate(service);

            return (
              <TableRow
                key={service.id}
                onClick={() => onRowClick(service)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onRowClick(service);
                }}
              >
                <TableCell className="font-mono text-xs">
                  {service.folio || service.id.slice(-6)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{relevantDate}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {(service as any).mileage
                    ? `${formatNumber((service as any).mileage)} km`
                    : "N/A"}
                </TableCell>
                <TableCell className="max-w-[420px] truncate">
                  {vehicleSafeText(getServiceDescriptionText(service))}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatCurrency(service.totalCost || 0)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={statusInfo.color as any}>{service.status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Historial de Servicios</CardTitle>
          <div className="text-xs text-muted-foreground">
            {sortedServices.length} servicio{sortedServices.length === 1 ? "" : "s"}
          </div>
        </div>
        <CardDescription>
          Servicios realizados a este vehículo. Toca/clic para ver detalles.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sortedServices.length > 0 ? (
          <>
            {/* Mobile */}
            <div className="sm:hidden">{renderMobileCards()}</div>

            {/* Tablet/Web */}
            <div className="hidden sm:block">{renderDesktopTable()}</div>
          </>
        ) : (
          <p className="text-muted-foreground">
            No hay historial de servicios para este vehículo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Evita que "undefined" o strings vacíos se vean feos en UI.
 * (No cambia datos, solo presentación).
 */
function vehicleSafeText(text: any) {
  const s = typeof text === "string" ? text.trim() : "";
  return s.length ? s : "Sin descripción";
}

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [isEngineEditDialogOpen, setIsEngineEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;

    const fetchVehicle = async () => {
      try {
        const fetchedVehicle = await inventoryService.getVehicleById(vehicleId);
        setVehicle(fetchedVehicle || null);
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        setVehicle(null);
        toast({
          title: "Error",
          description: "No se pudo cargar el vehículo.",
          variant: "destructive",
        });
      }
    };

    fetchVehicle();

    const unsubscribeServices = serviceService.onServicesForVehicleUpdate(vehicleId, setServices);
    const unsubscribePriceLists = inventoryService.onVehicleDataUpdate((data) =>
      setPriceLists(data as any[])
    );

    return () => {
      unsubscribeServices();
      unsubscribePriceLists();
    };
  }, [vehicleId, toast]);

  const vehicleEngineData = useMemo(() => {
    if (!vehicle || !vehicle.engine || priceLists.length === 0) return null;

    const makeData = priceLists.find((pl) => pl.make === vehicle.make);
    if (!makeData) return null;

    const modelData = makeData.models.find((m: any) => m.name === vehicle.model);
    if (!modelData) return null;

    const generationData = modelData.generations.find(
      (g: any) => vehicle.year >= g.startYear && vehicle.year <= g.endYear
    );
    if (!generationData) return null;

    return generationData.engines.find((e: any) => e.name === vehicle.engine) || null;
  }, [vehicle, priceLists]);

  const handleSaveEditedVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;
    try {
      await inventoryService.saveVehicle(formData, vehicle.id);
      setVehicle((prev) => (prev ? ({ ...prev, ...formData, id: prev.id } as Vehicle) : null));
      setIsEditDialogOpen(false);
      toast({ title: "Vehículo actualizado" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicle) return;
    try {
      await inventoryService.deleteVehicle(vehicle.id);
      toast({ title: "Vehículo eliminado", variant: "destructive" });
      router.push("/vehiculos");
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar el vehículo.",
        variant: "destructive",
      });
    }
  };

  const handleEngineDataSave = async (updatedEngineData: EngineData) => {
    if (!vehicle || !db) return;
    const { make, model, year } = vehicle;

    if (!make) {
      toast({
        title: "Error de Datos",
        description: "La marca del vehículo (make) no está definida. No se puede guardar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const makeData = priceLists.find((pl) => pl.make === make);
      if (!makeData) throw new Error("Make data not found in price list.");

      const modelIndex = makeData.models.findIndex((m: any) => m.name === model);
      if (modelIndex === -1) throw new Error("Model data not found.");

      const genIndex = makeData.models[modelIndex].generations.findIndex(
        (g: any) => year >= g.startYear && year <= g.endYear
      );
      if (genIndex === -1) throw new Error("Generation data not found.");

      const engineIndex = makeData.models[modelIndex].generations[genIndex].engines.findIndex(
        (e: any) => e.name === vehicleEngineData?.name
      );
      if (engineIndex === -1) throw new Error("Engine data not found.");

      const updatedModels = [...makeData.models];
      const updatedGenerations = [...updatedModels[modelIndex].generations];
      const updatedEngines = [...updatedGenerations[genIndex].engines];

      updatedEngines[engineIndex] = updatedEngineData;
      updatedGenerations[genIndex] = { ...updatedGenerations[genIndex], engines: updatedEngines };
      updatedModels[modelIndex] = { ...updatedModels[modelIndex], generations: updatedGenerations };

      await setDoc(doc(db, VEHICLE_COLLECTION, make), { models: updatedModels }, { merge: true });

      toast({
        title: "Guardado",
        description: `Se actualizaron los datos para ${updatedEngineData.name}.`,
      });
      setIsEngineEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving engine data:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios en la base de datos de precios.",
        variant: "destructive",
      });
    }
  };

  const openServicePreview = (service: ServiceRecord) => {
    setSelectedService(service);
    setIsViewServiceDialogOpen(true);
  };

  if (vehicle === undefined)
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );

  if (vehicle === null)
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center space-y-4">
        <h1 className="text-lg font-semibold">Vehículo no encontrado</h1>
        <Button onClick={() => router.push("/vehiculos")}>Volver</Button>
      </div>
    );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description={`ID Vehículo: ${vehicle.id}`}
        actions={
          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
            <ConfirmDialog
              triggerButton={
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              }
              title="¿Eliminar este vehículo?"
              description="Esta acción es permanente. Se eliminará el vehículo y todo su historial de servicios."
              onConfirm={handleDeleteVehicle}
            />

            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        }
      />

      {/* En md ya se muestra 2 columnas (tablet), en lg 5 cols con spans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mt-6">
        <div className="md:col-span-2 lg:col-span-3 space-y-4 sm:space-y-6">
          <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsEditDialogOpen(true)} />
          <ServiceHistoryTable services={services} onRowClick={openServicePreview} />
        </div>

        <div className="md:col-span-1 lg:col-span-2 space-y-4 sm:space-y-6">
          <MaintenanceCard vehicle={vehicle} serviceHistory={services} />
          <VehiclePricingCard
            engineData={vehicleEngineData as EngineData | null}
            make={vehicle.make}
            onEdit={() => setIsEngineEditDialogOpen(true)}
          />
        </div>
      </div>

      <VehicleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={vehicle}
        onSave={handleSaveEditedVehicle}
      />

      {vehicleEngineData && (
        <EditEngineDataDialog
          open={isEngineEditDialogOpen}
          onOpenChange={setIsEngineEditDialogOpen}
          engineData={vehicleEngineData}
          onSave={handleEngineDataSave}
        />
      )}

      {selectedService && (
        <UnifiedPreviewDialog
          open={isViewServiceDialogOpen}
          onOpenChange={setIsViewServiceDialogOpen}
          title="Vista Previa del Servicio"
          service={selectedService}
        >
          <div className="hidden" />
        </UnifiedPreviewDialog>
      )}
    </div>
  );
}
