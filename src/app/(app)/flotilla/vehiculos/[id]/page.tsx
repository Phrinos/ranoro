// src/app/(app)/flotilla/vehiculos/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { withSuspense } from "@/lib/withSuspense";
import { ArrowLeft, Loader2, Trash2, Info, FileText, Wrench, Edit, Car, User } from "lucide-react";
import { inventoryService, personnelService, serviceService } from "@/lib/services";
import type { ServiceRecord, FineCheck, Driver } from "@/types";
import { formatCurrency, cn, getStatusInfo } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { useFleetData } from "../../hooks/use-fleet-data";
import { EditVehicleDialog, type EditVehicleFormValues } from "../../components/dialogs/edit-vehicle-dialog";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { DocumentsTab } from "@/components/shared/documents-tab";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseFleetDate } from "../../hooks/use-fleet-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

function VehicleProfilePage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editDefaultTab, setEditDefaultTab] = useState<"info" | "rental" | "owner">("info");
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [servicePreviewOpen, setServicePreviewOpen] = useState(false);

  const fleetData = useFleetData();
  const vehicle = fleetData.vehicles.find(v => v.id === vehicleId) ?? null;
  const assignedDriver = vehicle?.assignedDriverId
    ? fleetData.drivers.find(d => d.id === vehicle.assignedDriverId) ?? null
    : null;

  useEffect(() => {
    if (!vehicleId) return;
    const unsub = serviceService.onServicesForVehicleUpdate(vehicleId, setServiceHistory);
    return () => unsub();
  }, [vehicleId]);

  if (fleetData.isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!vehicle) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Vehículo no encontrado.</p>
        <Button variant="outline" onClick={() => router.push("/flotilla?tab=vehiculos")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const handleSaveVehicle = async (values: EditVehicleFormValues) => {
    await inventoryService.saveVehicle(values, vehicle.id);
    toast({ title: "Vehículo actualizado" });
    setEditOpen(false);
  };

  const handleRemoveFromFleet = async () => {
    await inventoryService.saveVehicle({ isFleetVehicle: false }, vehicle.id);
    toast({ title: "Vehículo removido de la flotilla" });
    router.push("/flotilla?tab=vehiculos");
  };

  const handleAssignDriver = async (driverId: string | null) => {
    const allDrivers = fleetData.drivers;
    if (driverId) {
      await personnelService.assignVehicleToDriver(vehicle, driverId, allDrivers);
      toast({ title: "Conductor asignado" });
    } else {
      // Unassign
      await inventoryService.saveVehicle({ assignedDriverId: undefined, assignedDriverName: undefined } as any, vehicle.id);
      if (vehicle.assignedDriverId) {
        await personnelService.saveDriver({ assignedVehicleId: undefined, assignedVehicleLicensePlate: undefined }, vehicle.assignedDriverId);
      }
      toast({ title: "Conductor desvinculado" });
    }
  };

  const availableDrivers = fleetData.drivers.filter(d => !d.isArchived && (!d.assignedVehicleId || d.assignedVehicleId === vehicle.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-indigo-950 via-indigo-900 to-purple-900 p-5 sm:p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white font-mono tracking-wider">{vehicle.licensePlate}</h1>
              {assignedDriver ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-0 ring-1 ring-emerald-500/30">Activo</Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-300 border-0 ring-1 ring-amber-500/30">Disponible</Badge>
              )}
            </div>
            <p className="text-indigo-200 text-sm mt-0.5">{vehicle.make} {vehicle.model} · {vehicle.year}</p>
            {vehicle.dailyRentalCost && (
              <p className="text-emerald-300 text-sm font-bold mt-1">{formatCurrency(vehicle.dailyRentalCost)}/día</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => { setEditDefaultTab("info"); setEditOpen(true); }}>
              <Edit className="h-4 w-4 mr-1.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/flotilla?tab=vehiculos")} className="bg-white/5 border-white/20 text-white hover:bg-white/15 hover:text-white">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
            </Button>
            <ConfirmDialog
              triggerButton={<Button size="sm" className="bg-red-500/80 hover:bg-red-500 text-white border-0"><Trash2 className="h-4 w-4 mr-1.5" />Quitar</Button>}
              title="¿Quitar de la Flotilla?"
              description="El vehículo ya no aparecerá en flotilla."
              onConfirm={handleRemoveFromFleet}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border">
          <TabsTrigger value="details" className="rounded-xl gap-2"><Info className="h-3.5 w-3.5" /> Detalles</TabsTrigger>
          <TabsTrigger value="docs" className="rounded-xl gap-2"><FileText className="h-3.5 w-3.5" /> Documentos</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-xl gap-2"><Wrench className="h-3.5 w-3.5" /> Mantenimiento</TabsTrigger>
        </TabsList>

        {/* Details tab */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Vehicle info */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm">Información del Vehículo</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditDefaultTab("info"); setEditOpen(true); }}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
              {[
                { label: "Marca", value: vehicle.make },
                { label: "Modelo", value: vehicle.model },
                { label: "Año", value: String(vehicle.year) },
                { label: "Color", value: vehicle.color },
                { label: "VIN / Serie", value: vehicle.vin },
                { label: "No. Motor", value: vehicle.engineSerialNumber },
                { label: "Motor", value: vehicle.engine },
                { label: "Propietario", value: vehicle.ownerName },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold">{value}</span>
                </div>
              ) : null)}
            </div>

            {/* Rental system + driver */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm">Sistema de Renta</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditDefaultTab("rental"); setEditOpen(true); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {[
                  { label: "Renta diaria", value: vehicle.dailyRentalCost ? formatCurrency(vehicle.dailyRentalCost) : null },
                  { label: "GPS", value: vehicle.gpsCost ? formatCurrency(vehicle.gpsCost) : null },
                  { label: "Seguro", value: vehicle.insuranceCost ? formatCurrency(vehicle.insuranceCost) : null },
                  { label: "Admin", value: vehicle.adminCost ? formatCurrency(vehicle.adminCost) : null },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold">{value}</span>
                  </div>
                ) : null)}
              </div>

              {/* Driver assignment */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-sm">Conductor Asignado</h3>
                </div>
                {assignedDriver ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                      <div className="h-9 w-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                        {assignedDriver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{assignedDriver.name}</p>
                        {assignedDriver.phone && <p className="text-xs text-muted-foreground">{assignedDriver.phone}</p>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAssignDriver(null)}>
                      Desvincular Conductor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Sin conductor asignado.</p>
                    <Select onValueChange={(v) => handleAssignDriver(v)}>
                      <SelectTrigger><SelectValue placeholder="Asignar conductor..." /></SelectTrigger>
                      <SelectContent>
                        {availableDrivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Docs tab */}
        <TabsContent value="docs" className="mt-6">
          <DocumentsTab
            context="vehicle"
            vehicle={{
              licensePlate: vehicle.licensePlate,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              vin: vehicle.vin,
              ownerName: vehicle.ownerName,
              dailyRentalCost: vehicle.dailyRentalCost,
            }}
            person={assignedDriver ? { name: assignedDriver.name } : undefined}
          />
        </TabsContent>

        {/* Maintenance tab */}
        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Servicios</CardTitle>
              <CardDescription>Registro de intervenciones mecánicas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-black">
                    <TableRow>
                      <TableHead className="text-white">Folio</TableHead>
                      <TableHead className="text-white">Fecha</TableHead>
                      <TableHead className="text-white">Trabajo</TableHead>
                      <TableHead className="text-white text-right">Monto</TableHead>
                      <TableHead className="text-white">Estatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceHistory.length > 0 ? serviceHistory.map(s => {
                      const statusInfo = getStatusInfo(s.status as any);
                      const sDate = parseFleetDate(s.deliveryDateTime || s.serviceDate);
                      return (
                        <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedService(s); setServicePreviewOpen(true); }}>
                          <TableCell className="font-mono text-xs">{s.folio || s.id.slice(-6)}</TableCell>
                          <TableCell>{sDate ? format(sDate, "dd/MM/yy", { locale: es }) : "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{s.serviceItems?.[0]?.name || s.description || "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(s.totalCost || 0)}</TableCell>
                          <TableCell><Badge variant={statusInfo.color as any}>{s.status}</Badge></TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Sin servicios.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditVehicleDialog open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} onSave={handleSaveVehicle} defaultTab={editDefaultTab} />

      {selectedService && (
        <UnifiedPreviewDialog open={servicePreviewOpen} onOpenChange={setServicePreviewOpen} title="Resumen de Servicio" service={selectedService}>
          <div className="hidden" />
        </UnifiedPreviewDialog>
      )}
    </div>
  );
}

export default withSuspense(VehicleProfilePage);
