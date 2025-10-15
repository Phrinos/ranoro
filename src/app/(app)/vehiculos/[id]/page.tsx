// src/app/(app)/vehiculos/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import type { Vehicle, ServiceRecord } from "@/types";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Edit, CalendarCheck, Trash2, ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { VehicleDialog } from "../components/vehicle-dialog";
import type { VehicleFormValues } from "../components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { inventoryService, serviceService } from "@/lib/services";
import { parseDate } from "@/lib/forms";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { VehicleInfoCard } from "../components/VehicleInfoCard";

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Vista previa de servicio
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    const fetchVehicle = async () => {
      const fetchedVehicle = await inventoryService.getVehicleById(vehicleId);
      setVehicle(fetchedVehicle || null);
    };
    fetchVehicle();

    const unsubscribe = serviceService.onServicesForVehicleUpdate(
      vehicleId,
      setServices
    );
    return () => unsubscribe();
  }, [vehicleId]);

  const handleOpenEditDialog = useCallback(() => {
    setEditingVehicle(vehicle); // Carga el vehículo actual para editar
    setIsEditDialogOpen(true);
  }, [vehicle]);

  const handleSaveEditedVehicle = async (formData: VehicleFormValues) => {
    if (!editingVehicle) return;
    try {
      await inventoryService.saveVehicle(formData, editingVehicle.id);
      // Actualización optimista del estado local
      setVehicle((prev) => prev ? { ...prev, ...formData, id: prev.id } as Vehicle : prev);
      setIsEditDialogOpen(false);
      toast({ title: "Vehículo actualizado" });
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "No se pudo eliminar el vehículo.",
        variant: "destructive",
      });
    }
  };


  if (vehicle === undefined) {
    return (
      <div className="container mx-auto py-8 text-center">
        Cargando datos del vehículo...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Vehículo no encontrado</h1>
        <p className="text-muted-foreground">
          No se pudo encontrar un vehículo con el ID: {vehicleId}.
        </p>
        <Button asChild className="mt-6">
          <Link href="/vehiculos">Volver a Vehículos</Link>
        </Button>
      </div>
    );
  }

  const getStatusVariant = (
    status: ServiceRecord["status"]
  ):
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "success" => {
    switch (status) {
      case "Completado":
      case "Entregado":
        return "success";
      case "En Taller":
        return "secondary";
      case "Cancelado":
        return "destructive";
      case "Agendado":
        return "default";
      default:
        return "default";
    }
  };

  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map((item) => item.name).join(", ");
    }
    return service.description;
  };

  const openServicePreview = (service: ServiceRecord) => {
    setSelectedService(service);
    setIsViewServiceDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}`}
        description={`ID Vehículo: ${vehicle.id}`}
        actions={
            <div className="flex items-center gap-2">
                 <ConfirmDialog
                    triggerButton={
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Vehículo
                        </Button>
                    }
                    title="¿Eliminar este vehículo?"
                    description="Esta acción es permanente y no se puede deshacer. Se eliminará el vehículo y todo su historial de servicios."
                    onConfirm={handleDeleteVehicle}
                />
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger
            value="details"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Detalles
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Servicios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <VehicleInfoCard vehicle={vehicle} onEdit={handleOpenEditDialog} />
            </div>

            <div className="lg:col-span-1">
              {(vehicle as any).nextServiceInfo &&
                (vehicle as any).nextServiceInfo.date &&
                isValid(parseDate((vehicle as any).nextServiceInfo.date)!) && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg text-blue-800 dark:text-blue-300">
                        <CalendarCheck className="h-5 w-5" />
                        Próximo Servicio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="font-semibold">Fecha:</p>
                        <p>
                          {format(
                            parseDate((vehicle as any).nextServiceInfo.date)!,
                            "dd 'de' MMMM 'de' yyyy",
                            { locale: es }
                          )}
                        </p>
                      </div>
                      {(vehicle as any).nextServiceInfo.mileage && (
                        <div>
                          <p className="font-semibold">Kilometraje:</p>
                          <p>{formatNumber((vehicle as any).nextServiceInfo.mileage)} km</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Servicios</CardTitle>
              <CardDescription>
                Servicios realizados a este vehículo. Haz clic en una fila para
                ver/editar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-black">
                      <TableRow>
                        <TableHead className="text-white">Fecha</TableHead>
                        <TableHead className="text-white">Kilometraje</TableHead>
                        <TableHead className="text-white">Descripción</TableHead>
                        <TableHead className="text-right text-white">
                          Costo Total
                        </TableHead>
                        <TableHead className="text-white">Estado</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {services.map((service) => {
                        const relevantDate = service.deliveryDateTime
                          ? parseDate(service.deliveryDateTime)
                          : service.receptionDateTime
                          ? parseDate(service.receptionDateTime)
                          : service.serviceDate
                          ? parseDate(service.serviceDate)
                          : null;

                        const formattedDate =
                          relevantDate && isValid(relevantDate)
                            ? format(relevantDate, "dd MMM yyyy, HH:mm", {
                                locale: es,
                              })
                            : "N/A";

                        return (
                          <TableRow
                            key={service.id}
                            onClick={() => openServicePreview(service)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openServicePreview(service);
                              }
                              if (e.key === "ArrowRight") {
                                router.push(`/servicios/${service.id}`);
                              }
                            }}
                            tabIndex={0}
                            className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                          >
                            <TableCell>{formattedDate}</TableCell>
                            <TableCell>
                              {(service as any).mileage
                                ? `${formatNumber((service as any).mileage)} km`
                                : "N/A"}
                            </TableCell>
                            <TableCell>{getServiceDescriptionText(service)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(service.totalCost || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(service.status)}>
                                {service.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No hay historial de servicios para este vehículo.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <VehicleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={editingVehicle}
        onSave={handleSaveEditedVehicle}
      />

      {selectedService && vehicle && (
        <UnifiedPreviewDialog
          open={isViewServiceDialogOpen}
          onOpenChange={setIsViewServiceDialogOpen}
          title="Vista Previa del Servicio"
          service={selectedService}
          vehicle={vehicle}
        />
      )}
    </div>
  );
}
