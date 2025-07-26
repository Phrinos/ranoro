

"use client";

import { useParams, useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type {
  Vehicle,
  ServiceRecord,
  Technician,
  QuoteRecord,
  InventoryItem,
  ServiceTypeRecord,
  Personnel,
} from "@/types";
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
import {
  Archive,
  ShieldAlert,
  Edit,
  Eye,
  Printer,
  Copy,
  CalendarCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { VehicleDialog } from "../components/vehicle-dialog";
import type { VehicleFormValues } from "../components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { ServiceDialog } from "../../servicios/components/service-dialog";
import { PrintTicketDialog } from "@/components/ui/print-ticket-dialog";
import { TicketContent } from "@/components/ticket-content";
import { inventoryService, operationsService, personnelService } from "@/lib/services";
import { parseDate } from "@/lib/forms";

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const ticketContentRef = useRef<HTMLDivElement>(null);

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);

  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Personnel | null>(null);

  const fetchVehicleAndServices = useCallback(async () => {
    const fetchedVehicle = await inventoryService.getVehicleById(vehicleId);
    setVehicle(fetchedVehicle || null);
    if(fetchedVehicle) {
        const vehicleServices = await operationsService.getServicesForVehicle(vehicleId);
        setServices(vehicleServices);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicleAndServices();
    personnelService.onPersonnelUpdate(setPersonnel);
    inventoryService.onItemsUpdate(setInventory);
    inventoryService.onServiceTypesUpdate(setServiceTypes);
    inventoryService.onVehiclesUpdate(setAllVehicles); // to pass to dialog
  }, [fetchVehicleAndServices]);

  const handleSaveEditedVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;
    try {
      await inventoryService.saveVehicle(formData, vehicle.id);
      await fetchVehicleAndServices();
      setIsEditDialogOpen(false);
      toast({ title: "Vehículo Actualizado" });
    } catch (e) {
        toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  };

  const handleServiceUpdated = async (data: ServiceRecord | QuoteRecord) => {
    if (!("status" in data)) {
      toast({ title: "Error de Tipo", variant: "destructive" });
      return;
    }
    try {
        await operationsService.updateService((data as ServiceRecord).id, data);
        await fetchVehicleAndServices(); // Refetch to show updated service list
        setIsViewServiceDialogOpen(false);
        toast({ title: "Servicio Actualizado" });
    } catch (e) {
        toast({ title: "Error", description: "No se pudo actualizar el servicio.", variant: "destructive" });
    }
  };

  const handleServiceRowClick = (service: ServiceRecord) => {
    setSelectedService(service);
    setIsViewServiceDialogOpen(true);
  };
  
  if (vehicle === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del vehículo...</div>;
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Vehículo no encontrado</h1>
        <p className="text-muted-foreground">No se pudo encontrar un vehículo con el ID: {vehicleId}.</p>
        <Button asChild className="mt-6"><Link href="/vehiculos">Volver a Vehículos</Link></Button>
      </div>
    );
  }

  const getStatusVariant = (status: ServiceRecord["status"]): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) { case "Completado": case "Entregado": return "success"; case "En Taller": return "secondary"; case "Cancelado": return "destructive"; case "Agendado": return "default"; default: return "default"; }
  };

  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) return service.serviceItems.map((item) => item.name).join(", ");
    return service.description;
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader title={`${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}`} description={`ID Vehículo: ${vehicle.id}`} />
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6"><TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger><TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Servicios</TabsTrigger></TabsList>
        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Datos del Vehículo</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p><strong>Placa:</strong> {vehicle.licensePlate}</p>
                        <p><strong>Marca:</strong> {vehicle.make}</p>
                        <p><strong>Modelo:</strong> {vehicle.model}</p>
                        <p><strong>Año:</strong> {vehicle.year}</p>
                        <p><strong>VIN:</strong> {vehicle.vin || "N/A"}</p>
                        <p><strong>Color:</strong> {vehicle.color || "N/A"}</p>
                        {vehicle.notes && (<div className="pt-2"><p className="font-semibold">Notas del Vehículo:</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p></div>)}
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950/50">
                    <CardHeader><CardTitle>Datos del Propietario</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <p><strong>Nombre:</strong> {vehicle.ownerName}</p>
                        <p><strong>Teléfono:</strong> {vehicle.ownerPhone || "N/A"}</p>
                        <p><strong>Email:</strong> {vehicle.ownerEmail || "N/A"}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                {vehicle.nextServiceInfo && vehicle.nextServiceInfo.date && isValid(parseDate(vehicle.nextServiceInfo.date)) && (
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/30">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg text-blue-800 dark:text-blue-300">
                                <CalendarCheck className="h-5 w-5" />Próximo Servicio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <p className="font-semibold">Fecha:</p>
                                <p>{format(parseDate(vehicle.nextServiceInfo.date)!, "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                            </div>
                            {vehicle.nextServiceInfo.mileage && (
                                <div>
                                    <p className="font-semibold">Kilometraje:</p>
                                    <p>{vehicle.nextServiceInfo.mileage.toLocaleString("es-MX")} km</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="services">
          <Card><CardHeader><CardTitle>Historial de Servicios</CardTitle><CardDescription>Servicios realizados a este vehículo. Haz clic en una fila para ver/editar.</CardDescription></CardHeader><CardContent>{services.length > 0 ? (<div className="rounded-md border"><Table><TableHeader className="bg-black"><TableRow><TableHead className="text-white">Fecha</TableHead><TableHead className="text-white">Kilometraje</TableHead><TableHead className="text-white">Descripción</TableHead><TableHead className="text-white">Técnico</TableHead><TableHead className="text-right text-white">Costo Total</TableHead><TableHead className="text-white">Estado</TableHead></TableRow></TableHeader><TableBody>
            {services.map((service) => { 
                const relevantDate = service.deliveryDateTime ? parseDate(service.deliveryDateTime) : service.receptionDateTime ? parseDate(service.receptionDateTime) : service.serviceDate ? parseDate(service.serviceDate) : null;
                const formattedDate = relevantDate && isValid(relevantDate) ? format(relevantDate, "dd MMM yyyy, HH:mm", { locale: es }) : "N/A"; 
                return (
                    <TableRow key={service.id} onClick={() => handleServiceRowClick(service)} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>{service.mileage ? `${service.mileage.toLocaleString("es-ES")} km` : "N/A"}</TableCell>
                        <TableCell>{getServiceDescriptionText(service)}</TableCell>
                        <TableCell>{personnel.find((t) => t.id === service.technicianId)?.name || service.technicianId}</TableCell>
                        <TableCell className="text-right">${(service.totalCost || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(service.status)}>{service.status}</Badge></TableCell>
                    </TableRow>
                ); 
            })}
          </TableBody></Table></div>) : (<p className="text-muted-foreground">No hay historial de servicios para este vehículo.</p>)}</CardContent></Card>
        </TabsContent>
      </Tabs>
      {vehicle && (<VehicleDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} vehicle={vehicle} onSave={handleSaveEditedVehicle}/>)}
      {selectedService && (<ServiceDialog open={isViewServiceDialogOpen} onOpenChange={setIsViewServiceDialogOpen} service={selectedService} vehicles={allVehicles} technicians={personnel} inventoryItems={inventory} isReadOnly={false} onSave={handleServiceUpdated} mode="service" serviceTypes={serviceTypes} />)}
    </div>
  );
}
