
"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  placeholderVehicles, 
  placeholderServiceRecords, 
  placeholderInventory, 
  placeholderTechnicians, 
  persistToFirestore 
} from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord, QuoteRecord } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, Car, DollarSign, ShieldCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, compareAsc, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ServiceDialog } from '../../servicios/components/service-dialog';

interface GroupedServices {
  [monthYearKey: string]: { // key is "YYYY-MM"
    displayMonthYear: string;
    services: ServiceRecord[];
    totalCost: number;
  };
}


export default function FleetVehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const foundVehicle = placeholderVehicles.find(v => v.id === vehicleId && v.isFleetVehicle);
    setVehicle(foundVehicle || null);

    if (foundVehicle) {
      const vehicleServices = placeholderServiceRecords.filter(s => s.vehicleId === foundVehicle.id)
        .sort((a, b) => parseISO(b.serviceDate).getTime() - parseISO(a.serviceDate).getTime());
      setServices(vehicleServices);
    }
  }, [vehicleId]);

  const groupedServices = useMemo(() => {
    return services.reduce((acc: GroupedServices, service) => {
      const serviceDate = parseISO(service.serviceDate);
      if (!isValid(serviceDate)) return acc;

      const monthYearKey = format(serviceDate, 'yyyy-MM');
      const displayMonthYear = format(serviceDate, "MMMM 'de' yyyy", { locale: es });

      if (!acc[monthYearKey]) {
        acc[monthYearKey] = {
            displayMonthYear,
            services: [],
            totalCost: 0
        };
      }
      acc[monthYearKey].services.push(service);
      acc[monthYearKey].totalCost += service.totalCost;
      return acc;
    }, {});
  }, [services]);

  const handleOpenService = (service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };
  
  const handleServiceUpdated = useCallback(async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) return;
    const updatedService = data as ServiceRecord;

    setServices(prevServices =>
      prevServices.map(s => (s.id === updatedService.id ? updatedService : s))
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedService;
    }
    await persistToFirestore(['serviceRecords']);
    setIsEditDialogOpen(false);
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${updatedService.id} ha sido actualizado.`,
    });
  }, [toast]);

  if (vehicle === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del vehículo...</div>;
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Vehículo de Flotilla no encontrado</h1>
        <Button asChild className="mt-6"><Link href="/flotilla">Volver a Flotilla</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model}`}
        description="Detalles del vehículo de flotilla y su historial de mantenimiento."
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="maintenances">Mantenimientos</TabsTrigger>
          <TabsTrigger value="fines">Multas</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Información del Vehículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" />Vehículo</p>
                  <p className="font-semibold text-base">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                  <p>Placa: {vehicle.licensePlate}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Renta Diaria</p>
                  <p className="font-semibold text-base">${(vehicle.dailyRentalCost || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="font-medium text-muted-foreground">Propietario</p>
                  <p>{vehicle.ownerName} - {vehicle.ownerPhone}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="font-medium text-muted-foreground">Notas</p>
                  <p className="whitespace-pre-wrap">{vehicle.notes || 'Sin notas.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="maintenances">
          {Object.entries(groupedServices).length > 0 ? (
            Object.entries(groupedServices).sort((a,b) => b[0].localeCompare(a[0])).map(([key, monthData]) => (
              <Card key={key} className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="capitalize">{monthData.displayMonthYear}</CardTitle>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total del Mes</p>
                            <p className="text-lg font-bold">${monthData.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Kilometraje</TableHead><TableHead>Servicio</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {monthData.services.sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate))).map(service => (
                          <TableRow key={service.id} onClick={() => handleOpenService(service)} className="cursor-pointer">
                            <TableCell>{format(parseISO(service.serviceDate), "dd MMM, HH:mm", { locale: es })}</TableCell>
                            <TableCell>{service.mileage?.toLocaleString('es-ES')} km</TableCell>
                            <TableCell>{service.description}</TableCell>
                            <TableCell className="text-right">${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay mantenimientos registrados para este vehículo.</p>
          )}
        </TabsContent>

        <TabsContent value="fines">
            <Card>
                <CardHeader><CardTitle>Historial de Revisión de Multas</CardTitle><CardDescription>Registro de cuándo se ha verificado este vehículo.</CardDescription></CardHeader>
                <CardContent>
                    {(vehicle.fineCheckHistory && vehicle.fineCheckHistory.length > 0) ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader><TableRow><TableHead>Fecha de Revisión</TableHead><TableHead>Revisado por</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {vehicle.fineCheckHistory.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map((check, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{format(parseISO(check.date), "dd MMMM yyyy, HH:mm 'hrs'", { locale: es })}</TableCell>
                                            <TableCell>{check.checkedBy}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No hay registros de revisión de multas para este vehículo.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
      
      {editingService && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={placeholderVehicles} 
          technicians={placeholderTechnicians}
          inventoryItems={placeholderInventory}
          onSave={handleServiceUpdated}
          mode="service"
        />
      )}
    </div>
  );
}
