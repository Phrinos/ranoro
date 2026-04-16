// src/app/(app)/vehiculos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Loader2, Edit, ClipboardList, Car, Gauge, Calendar, Phone, AlertTriangle, FileText, ChevronRight, CheckCircle2, X } from "lucide-react";
import { inventoryService, serviceService } from "@/lib/services";
import type { Vehicle, ServiceRecord, NextServiceInfo } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { VehicleDialog } from "../components/vehicle-dialog";
import type { VehicleFormValues } from "@/schemas/vehicle-form-schema";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { parseDate } from "@/lib/forms";
import { formatNumber, formatCurrency, getStatusInfo, cn } from "@/lib/utils";
import { UnifiedPreviewDialog } from "@/components/shared/unified-preview-dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { pickLatestDeliveredService, getServiceMileage } from "@/lib/vehicles/serviceRecordHelpers";

const getServiceDescriptionText = (service: ServiceRecord) => {
  if (service.serviceItems && service.serviceItems.length > 0) {
    return service.serviceItems.map((item) => item.name).join(", ");
  }
  return service.description || "Mantenimiento / Servicio General";
};

const NextServiceDisplay = ({ nextServiceInfo }: { nextServiceInfo?: NextServiceInfo | null }) => {
  if (!nextServiceInfo || (!nextServiceInfo.date && !nextServiceInfo.mileage)) {
    return <span className="font-semibold text-sm">No programado</span>;
  }
  const date = nextServiceInfo.date ? parseDate(nextServiceInfo.date) : null;
  const isOverdue = date && isValid(date) ? new Date() > date : false;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", isOverdue ? "text-red-600 font-bold" : "text-amber-700")}>
      <span className="font-semibold text-sm">
        {date && isValid(date) ? format(date, "dd MMM yyyy", { locale: es }) : ""}
        {(date && nextServiceInfo.mileage) && " o a los "}
        {nextServiceInfo.mileage ? `${formatNumber(nextServiceInfo.mileage)} km` : ""}
      </span>
      {isOverdue && (
        <Badge variant="destructive" className="px-1.5 py-0 text-[10px] uppercase">Vencido</Badge>
      )}
    </div>
  );
};

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const userPermissions = usePermissions();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;

    const fetchVehicle = async () => {
      try {
        const fetchedVehicle = await inventoryService.getVehicleById(vehicleId);
        setVehicle(fetchedVehicle || null);
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        setVehicle(null);
        toast({ title: "Error", description: "No se pudo cargar el vehículo.", variant: "destructive" });
      }
    };

    fetchVehicle();
    const unsubscribeServices = serviceService.onServicesForVehicleUpdate(vehicleId, setServices);
    return () => unsubscribeServices();
  }, [vehicleId, toast]);

  const handleSaveEditedVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;
    try {
      await inventoryService.saveVehicle(formData, vehicle.id);
      setVehicle((prev) => (prev ? ({ ...prev, ...formData, id: prev.id } as Vehicle) : null));
      setIsEditDialogOpen(false);
      toast({ title: "Vehículo actualizado" });
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicle) return;
    try {
      await inventoryService.deleteVehicle(vehicle.id);
      toast({ title: "Vehículo eliminado", variant: "destructive" });
      router.push("/vehiculos");
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el vehículo.", variant: "destructive" });
    }
  };

  const latestService = useMemo(() => pickLatestDeliveredService(services), [services]);
  const lastServiceDate = useMemo(() => {
    const fromHistory = latestService?.date ?? null;
    if (fromHistory && isValid(fromHistory)) return fromHistory;
    return vehicle?.lastServiceDate ? parseDate(vehicle.lastServiceDate) : null;
  }, [latestService, vehicle?.lastServiceDate]);

  const lastServiceMileage = latestService?.mileage ?? null;

  const currentMileage = useMemo(() => {
    if (!vehicle) return 0;
    const base = Number(vehicle.currentMileage || 0) || 0;
    const maxFromServices = services
      .map(getServiceMileage)
      .filter((n): n is number => typeof n === "number" && !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);
    return Math.max(base, maxFromServices, lastServiceMileage ?? 0);
  }, [vehicle, services, lastServiceMileage]);

  // Derived sorted services (descending)
  const recentServices = useMemo(() => {
    return [...services].sort((a, b) => {
      const da = parseDate(a.deliveryDateTime || a.serviceDate || '')?.getTime() || 0;
      const db = parseDate(b.deliveryDateTime || b.serviceDate || '')?.getTime() || 0;
      return db - da;
    });
  }, [services]);

  if (vehicle === undefined)
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (vehicle === null)
    return (
      <div className="container mx-auto px-4 py-8 text-center space-y-4">
        <h1 className="text-xl font-bold bg-muted/20 p-8 rounded-xl">Registro Inexistente</h1>
        <Button onClick={() => router.push("/vehiculos")}>Volver a Directorio</Button>
      </div>
    );

  const formatRelevantDate = (service: ServiceRecord) => {
    const date = parseDate(service.deliveryDateTime || service.receptionDateTime || service.serviceDate);
    return date && isValid(date) ? format(date, "dd MMM yyyy", { locale: es }) : "N/A";
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-500 max-w-6xl">
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground pl-0 -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Directorio
        </Button>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {userPermissions.has('fleet:edit') && (
            <Button variant="outline" className="w-full sm:w-auto shadow-sm" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" /> Editar Vehículo
            </Button>
          )}
          {userPermissions.has('fleet:delete') && (
             <ConfirmDialog
               triggerButton={
                 <Button variant="outline" className="w-full sm:w-auto text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 shadow-sm transition-colors">
                   <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                 </Button>
               }
               title="¿Eliminar este vehículo?"
               description="Esta acción eliminará de la base local el vehículo."
               onConfirm={handleDeleteVehicle}
             />
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* EXPEDIENTE MAIN UNIFIED CARD */}
        <Card className="overflow-hidden border border-border/60 shadow-xl bg-card rounded-2xl">
          
          {/* SEC 1: IDENTIFICATION */}
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 lg:p-10 text-white">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Car className="w-48 h-48 -mr-16 -mt-16" />
            </div>
            
            <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-6 items-start">
              
              <div className="space-y-4">
                <Badge variant="outline" className="bg-white/10 text-xl tracking-widest text-white border-white/20 px-4 py-1.5 font-mono shadow-sm">
                  {vehicle.licensePlate || 'SIN PLACA'}
                </Badge>
                
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-1">
                    {vehicle.make} <span className="font-medium text-slate-300">{vehicle.model}</span>
                  </h1>
                  <div className="flex items-center gap-3 text-slate-300 font-medium">
                    <span className="bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">{vehicle.year}</span>
                    {vehicle.color && <span className="flex items-center gap-1.5 hidden"><div className="w-3 h-3 rounded-full border border-white/20" style={{backgroundColor: vehicle.color.toLowerCase()}} /></span>}
                    {vehicle.color && <span>{vehicle.color}</span>}
                  </div>
                </div>
              </div>

              {/* OWNER BLOCK */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:min-w-[280px] shadow-sm">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Dueño / Contacto</h3>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-white tracking-snug">{vehicle.ownerName || <span className="italic font-normal opacity-50">Sin Asignar</span>}</p>
                  {vehicle.ownerPhone && (
                     <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
                       <Phone className="w-3.5 h-3.5 opacity-70" />
                       {vehicle.ownerPhone}
                     </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* SEC 2: MAINTENANCE METRICS */}
          <div className="p-6 sm:p-8 bg-slate-50 border-b border-border/50">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               
               {/* Current Mileage */}
               <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="bg-primary/10 p-2 rounded-xl"><Gauge className="w-4 h-4 text-primary" /></div>
                   <span className="text-xs tracking-widest font-bold text-muted-foreground uppercase">Kilometraje</span>
                 </div>
                 <p className="text-3xl font-black font-mono text-slate-900">{formatNumber(currentMileage) || '—'} <span className="text-base text-muted-foreground font-medium">km</span></p>
               </div>

                {/* Last Service Date */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="bg-blue-500/10 p-2 rounded-xl"><Calendar className="w-4 h-4 text-blue-600" /></div>
                   <span className="text-xs tracking-widest font-bold text-muted-foreground uppercase">Última Visita</span>
                 </div>
                 <div>
                   <p className="text-2xl font-black text-slate-900">{lastServiceDate && isValid(lastServiceDate) ? format(lastServiceDate, "dd MMM yyyy", { locale: es }) : '—'}</p>
                   {lastServiceMileage !== null && <p className="text-xs text-muted-foreground font-medium mt-1">Ref: {formatNumber(lastServiceMileage)} km</p>}
                 </div>
               </div>

                {/* Next Recommended */}
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col justify-between sm:col-span-2 lg:col-span-2">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="bg-amber-500/20 p-2 rounded-xl"><AlertTriangle className="w-4 h-4 text-amber-700" /></div>
                   <span className="text-xs tracking-widest font-bold text-amber-800 uppercase">Aviso de Próximo Servicio</span>
                 </div>
                 <div className="bg-white/60 p-3 rounded-xl border border-amber-200/50">
                    <NextServiceDisplay nextServiceInfo={(vehicle as any).nextServiceInfo} />
                 </div>
               </div>

             </div>
          </div>

          {/* SEC 3: SERVICE HISTORY INTEGRATED */}
          <div className="p-0">
             <div className="px-6 sm:px-8 py-5 bg-card border-b border-border flex items-center justify-between">
               <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-muted-foreground" />
                  Historial de Intervenciones
               </h3>
               <Badge variant="secondary" className="font-mono">{recentServices.length} Registros</Badge>
             </div>

             {recentServices.length === 0 ? (
               <div className="p-12 text-center text-muted-foreground bg-slate-50/50 flex flex-col items-center">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 border">
                    <ClipboardList className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-600">Este vehículo no tiene servicios realizados en el taller aún.</p>
               </div>
             ) : (
                <div className="divide-y divide-border/60">
                  {recentServices.map((service, idx) => {
                     const statusInfo = getStatusInfo(service.status as any);
                     return (
                        <div 
                           key={service.id} 
                           className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 sm:px-8 hover:bg-slate-50 transition-colors cursor-pointer"
                           onClick={() => {
                             setSelectedService(service);
                             setIsViewServiceDialogOpen(true);
                           }}
                        >
                           <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 sm:items-center">
                              <div className="flex items-center gap-3 w-[140px] shrink-0">
                                 {service.status === "Entregado" ? (
                                   <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                 ) : service.status === "Cancelado" ? (
                                   <X className="w-4 h-4 text-red-500" />
                                 ) : (
                                   <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                 )}
                                 <div className="flex flex-col">
                                    <span className="font-semibold text-sm">{formatRelevantDate(service)}</span>
                                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{service.folio || service.id.slice(-6)}</span>
                                 </div>
                              </div>
                              
                              <div className="flex flex-col justify-center max-w-[400px]">
                                 <span className="text-sm font-medium text-slate-800 line-clamp-1">{getServiceDescriptionText(service)}</span>
                                 <Badge variant={statusInfo.color as any} className="w-fit mt-1 px-1.5 py-0 text-[10px] uppercase font-bold">{service.status}</Badge>
                              </div>
                           </div>

                           <div className="flex items-center gap-6 mt-3 sm:mt-0 opacity-80 sm:opacity-100 pr-2">
                             {(service as any).mileage && (
                               <div className="text-right hidden md:block">
                                  <span className="text-xs text-muted-foreground uppercase tracking-wider block">KM</span>
                                  <span className="font-mono font-medium text-sm text-slate-700">{formatNumber((service as any).mileage)}</span>
                               </div>
                             )}
                             <div className="text-right">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider block">Total</span>
                                <span className="font-bold text-slate-900">{formatCurrency(service.totalCost || 0)}</span>
                             </div>
                             <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -ml-2" />
                           </div>
                        </div>
                     )
                  })}
                </div>
             )}
          </div>
          
          {/* SEC 4: NOTES */}
          {vehicle.notes && (
             <div className="p-6 sm:p-8 bg-amber-50/50 border-t border-border mt-auto">
               <h4 className="font-bold text-xs tracking-widest text-amber-800 uppercase flex items-center gap-2 mb-3">
                 <FileText className="w-3.5 h-3.5" /> Notas Adicionales
               </h4>
               <p className="text-sm text-amber-950/80 whitespace-pre-wrap leading-relaxed">{vehicle.notes}</p>
             </div>
          )}

        </Card>
      </div>

      <VehicleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        vehicle={vehicle}
        onSave={handleSaveEditedVehicle}
      />

      {selectedService && (
        <UnifiedPreviewDialog
          open={isViewServiceDialogOpen}
          onOpenChange={setIsViewServiceDialogOpen}
          title="Resumen del Servicio"
          service={selectedService}
        >
          <div className="hidden" />
        </UnifiedPreviewDialog>
      )}
    </div>
  );
}
