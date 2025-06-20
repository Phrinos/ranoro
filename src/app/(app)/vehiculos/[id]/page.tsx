
"use client";

import { useParams, useRouter } from 'next/navigation';
import { placeholderVehicles, placeholderServiceRecords, placeholderTechnicians, placeholderInventory } from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord, Technician, QuoteRecord, InventoryItem } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, ShieldAlert, Edit, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VehicleDialog } from '../components/vehicle-dialog';
import type { VehicleFormValues } from '../components/vehicle-form';
import { useToast } from '@/hooks/use-toast';
import { ServiceDialog } from '../../servicios/components/service-dialog'; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = parseInt(params.id as string, 10);
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewServiceDialogOpen, setIsViewServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);

  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);


  useEffect(() => {
    const foundVehicle = placeholderVehicles.find(v => v.id === vehicleId);
    setVehicle(foundVehicle || null);

    if (foundVehicle) {
      const vehicleServices = placeholderServiceRecords.filter(s => s.vehicleId === foundVehicle.id)
        .sort((a, b) => parseISO(b.serviceDate).getTime() - parseISO(a.serviceDate).getTime());
      setServices(vehicleServices);
    }
    
    setTechnicians(placeholderTechnicians);

  }, [vehicleId]);

  const handleSaveEditedVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;

    const updatedVehicleData: Partial<Vehicle> = {
        ...formData,
        year: Number(formData.year), 
    };
    
    const updatedVehicle = { ...vehicle, ...updatedVehicleData } as Vehicle;
    setVehicle(updatedVehicle);

    const pIndex = placeholderVehicles.findIndex(v => v.id === updatedVehicle.id);
    if (pIndex !== -1) {
      placeholderVehicles[pIndex] = updatedVehicle;
    }

    setIsEditDialogOpen(false);
    toast({
      title: "Vehículo Actualizado",
      description: `Los datos del vehículo ${updatedVehicle.make} ${updatedVehicle.model} han sido actualizados.`,
    });
  };
  
  const handleServiceUpdated = async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) { // Check if it's a ServiceRecord
      toast({
        title: "Error de Tipo",
        description: "Se esperaba un registro de servicio para actualizar.",
        variant: "destructive",
      });
      return;
    }
    const updatedService = data as ServiceRecord;

    setServices(prevServices =>
      prevServices.map(s => (s.id === updatedService.id ? updatedService : s))
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedService;
    }
    setIsViewServiceDialogOpen(false); 
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${updatedService.id} para el vehículo ${vehicle?.licensePlate} ha sido actualizado.`,
    });

    if (updatedService.status === 'Completado') {
      setCurrentServiceForTicket(updatedService);
      setCurrentTechnicianForTicket(technicians.find(t => t.id === updatedService.technicianId) || null);
      setShowPrintTicketDialog(true);
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
        <Button asChild className="mt-6">
          <Link href="/vehiculos">Volver a Vehículos</Link>
        </Button>
      </div>
    );
  }

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success";
      case "Reparando": return "secondary";
      case "Cancelado": return "destructive";
      case "Agendado": return "default";
      default: return "default";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`}
        description={`ID Vehículo: ${vehicle.id}`}
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-1/3 mb-6">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detalles</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Servicios</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Datos del Vehículo</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Placa:</strong> {vehicle.licensePlate}</p>
                <p><strong>Marca:</strong> {vehicle.make}</p>
                <p><strong>Modelo:</strong> {vehicle.model}</p>
                <p><strong>Año:</strong> {vehicle.year}</p>
                <p><strong>VIN:</strong> {vehicle.vin || 'N/A'}</p>
                <p><strong>Color:</strong> {vehicle.color || 'N/A'}</p>
                {vehicle.notes && (
                  <div className="pt-2">
                    <p className="font-semibold">Notas del Vehículo:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Datos del Propietario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Nombre:</strong> {vehicle.ownerName}</p>
                <p><strong>Teléfono:</strong> {vehicle.ownerPhone || 'N/A'}</p>
                <p><strong>Email:</strong> {vehicle.ownerEmail || 'N/A'}</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 flex justify-start">
            <Button variant="outline">
              <Archive className="mr-2 h-4 w-4" />
              Archivar Vehículo
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Servicios</CardTitle>
              <CardDescription>Servicios realizados a este vehículo. Haz clic en una fila para ver/editar.</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Kilometraje</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead className="text-right">Costo Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map(service => (
                      <TableRow key={service.id} onClick={() => handleServiceRowClick(service)} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>{format(parseISO(service.serviceDate), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                        <TableCell>{service.mileage ? `${service.mileage.toLocaleString('es-ES')} km` : 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                        <TableCell>{technicians.find(t => t.id === service.technicianId)?.name || service.technicianId}</TableCell>
                        <TableCell className="text-right">${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(service.status)}>{service.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay historial de servicios para este vehículo.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {vehicle && (
         <VehicleDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            vehicle={vehicle}
            onSave={handleSaveEditedVehicle}
          />
      )}
      {selectedService && (
        <ServiceDialog
          open={isViewServiceDialogOpen}
          onOpenChange={setIsViewServiceDialogOpen}
          service={selectedService}
          vehicles={placeholderVehicles} 
          technicians={technicians}
          inventoryItems={placeholderInventory}
          isReadOnly={false} 
          onSave={handleServiceUpdated}
          mode="service"
        />
      )}
      {currentServiceForTicket && vehicle && (
        <PrintTicketDialog
          open={showPrintTicketDialog}
          onOpenChange={setShowPrintTicketDialog}
          title="Comprobante de Servicio"
          onDialogClose={() => setCurrentServiceForTicket(null)}
        >
          <TicketContent 
            service={currentServiceForTicket} 
            vehicle={vehicle} 
            technician={currentTechnicianForTicket || undefined}
          />
        </PrintTicketDialog>
      )}
    </div>
  );
}
