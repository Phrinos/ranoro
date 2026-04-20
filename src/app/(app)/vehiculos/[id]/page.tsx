// src/app/(app)/vehiculos/[id]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Loader2, Edit, ClipboardList, Car, Gauge, Calendar, Phone, AlertTriangle, FileText, ChevronRight, CheckCircle2, X, MessageCircle } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  const totalPages = Math.ceil(recentServices.length / itemsPerPage);
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return recentServices.slice(startIndex, startIndex + itemsPerPage);
  }, [recentServices, currentPage]);

  const handleWhatsApp = () => {
    if (vehicle?.ownerPhone) {
        let phone = vehicle.ownerPhone.replace(/\D/g, '');
        // Default to MX code if none provided and 10 digits
        if (phone.length === 10) phone = '52' + phone; 
        window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const nextServiceData = useMemo(() => {
    return (latestService as any)?.s?.nextServiceInfo || (vehicle as any)?.nextServiceInfo;
  }, [latestService, vehicle]);

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
      
      <div className="space-y-6">
        {/* HEADER BACK BUTTON */}
        <div className="mb-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground pl-0 -ml-2" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Directorio de Vehículos
          </Button>
        </div>

        {/* TOP ROW: UNIFIED VEHICLE & CONTACT CARD */}
        <Card className="border-border/60 shadow-lg overflow-hidden bg-white relative rounded-2xl">
            {/* AMBIENT BACKGROUND ICON */}
            <Car className="w-[500px] h-[500px] absolute -right-24 -top-32 opacity-[0.03] pointer-events-none text-red-600" />
            
            {/* FLOATING ACTIONS TOP RIGHT */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
               {userPermissions.has('fleet:edit') && (
                 <Button variant="outline" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full w-10 h-10 transition-all bg-white shadow-xs border-slate-200" onClick={() => setIsEditDialogOpen(true)}>
                   <Edit className="w-4 h-4" />
                 </Button>
               )}
               {userPermissions.has('fleet:delete') && (
                  <ConfirmDialog
                    triggerButton={
                      <Button variant="outline" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-full w-10 h-10 transition-all bg-white shadow-xs border-slate-200">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    }
                    title="¿Eliminar este vehículo?"
                    description="Esta acción eliminará de la base local el vehículo."
                    onConfirm={handleDeleteVehicle}
                  />
               )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 p-6 sm:p-10 relative z-10 w-full">
               
               {/* 1. VEHICLE DETAILS */}
               <div className="flex-1 space-y-6 md:border-r md:border-slate-100 md:pr-10">
                  <h1 className="text-5xl sm:text-6xl md:text-[5rem] font-black tracking-tighter text-red-600 leading-none pt-2">
                     {vehicle.licensePlate || 'SIN PLACA'}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-lg font-medium text-slate-600">
                    <span className="text-slate-900 font-extrabold tracking-tight text-xl sm:text-2xl">{vehicle.make}</span>
                    <span className="text-xl sm:text-2xl">{vehicle.model}</span>
                    <span className="bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200 text-slate-700 text-sm font-bold shadow-xs">{vehicle.year}</span>
                    {vehicle.color && (
                      <span className="flex items-center gap-1.5 ml-1">
                         <div className="w-4 h-4 rounded-full border border-slate-200 shadow-inner" style={{backgroundColor: vehicle.color.toLowerCase()}} title={vehicle.color} />
                         <span className="capitalize text-base opacity-80">{vehicle.color}</span>
                      </span>
                    )}
                  </div>
                  
                  {/* TECHNICAL BADGES */}
                  <div className="flex flex-wrap gap-x-10 gap-y-6 items-center text-sm font-mono text-slate-500 pt-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">Tipo de Motor</span>
                        <span className="text-base font-bold text-slate-800 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-100 shadow-xs">{vehicle.engine || '—'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">Núm. de Motor</span>
                        <span className="text-base text-slate-700 font-medium px-1">{vehicle.engineSerialNumber || '—'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">Número VIN</span>
                        <span className="text-base text-slate-700 font-medium bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-100 shadow-xs tracking-wider">{vehicle.vin || '—'}</span>
                      </div>
                  </div>
               </div>

               {/* 2. CONTACT DETAILS */}
               <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col justify-center pt-6 border-t border-slate-100 md:border-0 md:pt-0">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-slate-200/50 to-transparent rounded-bl-full pointer-events-none" />
                      
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs border border-slate-200">
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">Contacto Directo</h3>
                      </div>
                      
                      <div className="relative z-10">
                        <p className="text-2xl font-black text-slate-900 mb-3 leading-tight line-clamp-2">
                           {vehicle.ownerName || <span className="italic font-normal text-lg opacity-50">Dueño no asignado</span>}
                        </p>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-lg font-mono text-slate-700 font-bold bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                             {vehicle.ownerPhone || 'S/N'}
                          </span>
                          
                          {vehicle.ownerPhone && (
                             <Button 
                               onClick={handleWhatsApp} 
                               className="bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl transition-all h-[42px] px-3.5 shadow-xs font-bold flex gap-2 items-center"
                               title="Contactar vía WhatsApp"
                             >
                               <MessageCircle className="w-5 h-5 shrink-0" />
                               <span className="inline">Chat</span>
                             </Button>
                          )}
                        </div>
                      </div>
                  </div>
               </div>
            </div>
        </Card>

        {/* MIDDLE ROW: KM AND NEXT SERVICE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="border-border/60 shadow-xs flex items-center p-6 bg-white gap-6 hover:shadow-md transition-shadow">
              <div className="bg-primary/10 p-4 rounded-2xl shrink-0"><Gauge className="w-8 h-8 text-primary" /></div>
              <div>
                <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-1.5">Kilometraje Actual</h3>
                <p className="font-black font-mono text-3xl sm:text-4xl text-slate-900">{formatNumber(currentMileage)} <span className="text-lg font-bold text-slate-400 font-sans">km</span></p>
              </div>
           </Card>
           
           <Card className="border-amber-200/60 shadow-xs flex items-center p-6 bg-amber-50 gap-6 hover:shadow-md transition-shadow">
              <div className="bg-amber-500/20 p-4 rounded-2xl shrink-0"><Calendar className="w-8 h-8 text-amber-700" /></div>
              <div>
                <h3 className="font-bold text-xs text-amber-800 uppercase tracking-widest mb-2">Aviso de Próximo Servicio</h3>
                <div className="scale-110 origin-left">
                  <NextServiceDisplay nextServiceInfo={nextServiceData} />
                </div>
              </div>
           </Card>
        </div>

        {/* BOTTOM SECTION: PAGINATED SERVICES */}
        <Card className="border-border/60 shadow-md">
           <div className="px-6 py-5 bg-slate-50/50 border-b border-border flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="bg-white p-2 rounded-lg border shadow-xs"><ClipboardList className="w-4 h-4 text-primary" /></div>
               <h3 className="font-bold text-lg text-slate-800">Historial de Intervenciones</h3>
             </div>
             <Badge variant="secondary" className="font-mono text-sm px-3 py-1">{recentServices.length} Registros</Badge>
           </div>

           {recentServices.length === 0 ? (
             <div className="p-12 text-center text-muted-foreground bg-white flex flex-col items-center">
                <div className="bg-slate-50 p-4 rounded-full shadow-xs mb-4 border border-slate-100">
                  <ClipboardList className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-600">Este vehículo no tiene servicios realizados en el taller aún.</p>
             </div>
           ) : (
             <div className="bg-white">
                <div className="divide-y divide-border/60">
                {paginatedServices.map((service) => {
                    const statusInfo = getStatusInfo(service.status as any);
                    return (
                      <div 
                         key={service.id} 
                         className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 sm:px-8 hover:bg-slate-50 transition-colors cursor-pointer"
                         onClick={() => router.push(`/servicios/${service.id}`)}
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
                                  <span className="font-semibold text-sm text-slate-700">{formatRelevantDate(service)}</span>
                                  <span className="font-mono text-[10px] text-muted-foreground uppercase">{service.folio || service.id.slice(-6)}</span>
                               </div>
                            </div>
                            
                            <div className="flex flex-col justify-center max-w-[400px]">
                               <span className="text-sm font-medium text-slate-800 line-clamp-1">{getServiceDescriptionText(service)}</span>
                               <Badge variant={statusInfo.color as any} className="w-fit mt-1 px-1.5 py-0 text-[10px] uppercase font-bold">{service.status}</Badge>
                            </div>
                         </div>

                         <div className="flex items-center gap-6 mt-3 sm:mt-0 pr-2">
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
                           <div className="bg-white group-hover:bg-primary shadow-xs border border-slate-200 group-hover:border-primary rounded-full p-1.5 transition-colors">
                             <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                           </div>
                         </div>
                      </div>
                    )
                })}
                </div>
                
                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between bg-slate-50">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
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
    </div>
  );
}
