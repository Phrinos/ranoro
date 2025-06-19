
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Clock } from "lucide-react";
import { 
  placeholderServiceRecords, 
  placeholderVehicles, 
  placeholderTechnicians, 
  placeholderInventory 
} from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem } from "@/types";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, compareAsc } from "date-fns";
import { es } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ServiceDialog } from "../components/service-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface GroupedServices {
  [date: string]: ServiceRecord[];
}

export default function AgendaServiciosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRecord[]>(placeholderServiceRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechniciansState] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItemsState] = useState<InventoryItem[]>(placeholderInventory);

  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);


  useEffect(() => {
    setServices(placeholderServiceRecords);
    setVehicles(placeholderVehicles);
    setTechniciansState(placeholderTechnicians);
    setInventoryItemsState(placeholderInventory);
  }, []);
  
  const handleOpenEditDialog = (service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };

  const handleUpdateService = (updatedService: ServiceRecord) => {
    setServices(prevServices =>
      prevServices.map(s => (s.id === updatedService.id ? updatedService : s))
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedService;
    }
     toast({
      title: "Servicio Actualizado",
      description: `El servicio para ${vehicles.find(v => v.id === updatedService.vehicleId)?.licensePlate} ha sido actualizado.`,
    });
  };

  const handleDeleteService = (serviceId: string) => {
    const serviceToDelete = services.find(s => s.id === serviceId);
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (pIndex !== -1) {
      placeholderServiceRecords.splice(pIndex, 1);
    }
    toast({
      title: "Servicio Eliminado",
      description: `El servicio con ID ${serviceId} (${serviceToDelete?.description}) ha sido eliminado.`,
    });
  };
  
  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if (prev.find(v => v.id === newVehicle.id)) return prev;
      return [...prev, newVehicle];
    });
  };


  const groupedServices = useMemo(() => {
    return services
      .sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)))
      .reduce((acc: GroupedServices, service) => {
        const dateKey = format(parseISO(service.serviceDate), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(service);
        return acc;
      }, {});
  }, [services]);

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success";
      case "En Progreso": return "secondary";
      case "Pendiente": return "outline";
      case "Cancelado": return "destructive";
      case "Agendado": return "default";
      default: return "default";
    }
  };

  return (
    <>
      <PageHeader
        title="Agenda de Servicios"
        description="Visualiza los servicios agrupados por fecha."
        actions={
          <Button onClick={() => router.push('/servicios/nuevo')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Button>
        }
      />
      
      {Object.keys(groupedServices).length === 0 && (
        <p className="text-muted-foreground text-center py-8">No hay servicios agendados.</p>
      )}

      {Object.entries(groupedServices).map(([date, dayServices]) => (
        <Card key={date} className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">
              {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Precio Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayServices.map(service => {
                    const vehicle = vehicles.find(v => v.id === service.vehicleId);
                    const technician = technicians.find(t => t.id === service.technicianId);
                    const formattedDelivery = service.deliveryDateTime 
                        ? format(parseISO(service.deliveryDateTime), "dd MMM, HH:mm", { locale: es }) 
                        : 'N/A';
                    return (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.id}</TableCell>
                        <TableCell>{vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : service.vehicleId}</TableCell>
                        <TableCell>{technician ? technician.name : service.technicianId}</TableCell>
                        <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                        <TableCell className="text-right">${service.totalCost.toLocaleString('es-ES')}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(service.status)}>{service.status}</Badge></TableCell>
                        <TableCell>
                          {service.status === 'Completado' && service.deliveryDateTime ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3"/> 
                                {formattedDelivery}
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(service)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Servicio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este servicio?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteService(service.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Sí, Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
      {isEditDialogOpen && editingService && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleUpdateService}
          onVehicleCreated={handleVehicleCreated}
        />
      )}
    </>
  );
}
