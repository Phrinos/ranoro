
"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  placeholderVehicles, 
  placeholderServiceRecords, 
  placeholderInventory, 
  placeholderTechnicians, 
  persistToFirestore 
} from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord, QuoteRecord, VehiclePaperwork } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, Car, ArrowLeft, Trash2, PlusCircle, CheckCircle, Circle, Gauge } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareAsc, isValid, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ServiceDialog } from '../../servicios/components/service-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PaperworkDialog } from '../components/paperwork-dialog';
import type { PaperworkFormValues } from '../components/paperwork-form';
import { cn, formatCurrency } from '@/lib/utils';
import { VehicleDialog } from '../../vehiculos/components/vehicle-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';

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
  
  const [isPaperworkDialogOpen, setIsPaperworkDialogOpen] = useState(false);
  const [editingPaperwork, setEditingPaperwork] = useState<VehiclePaperwork | null>(null);
  
  const [isVehicleEditDialogOpen, setIsVehicleEditDialogOpen] = useState(false);

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

  const handleRemoveFromFleet = async () => {
    if (!vehicle) return;

    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
    if (vehicleIndex > -1) {
      placeholderVehicles[vehicleIndex].isFleetVehicle = false;
      delete placeholderVehicles[vehicleIndex].dailyRentalCost;
    }

    await persistToFirestore(['vehicles']);
    
    toast({
      title: "Vehículo Removido",
      description: `${vehicle.licensePlate} ha sido removido de la flotilla.`,
    });

    router.push('/flotilla');
  };

  const handleOpenPaperworkDialog = (paperwork?: VehiclePaperwork) => {
    setEditingPaperwork(paperwork || null);
    setIsPaperworkDialogOpen(true);
  };

  const handleSavePaperwork = useCallback(async (values: PaperworkFormValues) => {
    if (!vehicle) return;
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return;

    const currentVehicle = placeholderVehicles[vehicleIndex];
    if (!currentVehicle.paperwork) {
      currentVehicle.paperwork = [];
    }

    if (editingPaperwork) {
      const pIndex = currentVehicle.paperwork.findIndex(p => p.id === editingPaperwork.id);
      if (pIndex !== -1) {
        currentVehicle.paperwork[pIndex] = { ...currentVehicle.paperwork[pIndex], name: values.name, dueDate: values.dueDate.toISOString(), notes: values.notes };
      }
    } else {
      currentVehicle.paperwork.push({ id: `doc_${Date.now()}`, name: values.name, dueDate: values.dueDate.toISOString(), status: 'Pendiente', notes: values.notes });
    }
    
    await persistToFirestore(['vehicles']);
    setVehicle({ ...currentVehicle });
    setIsPaperworkDialogOpen(false);
    toast({ title: "Trámite Guardado", description: "La lista de trámites ha sido actualizada." });
  }, [vehicle, vehicleId, editingPaperwork, toast]);

  const handleTogglePaperworkStatus = useCallback(async (paperworkId: string) => {
    if (!vehicle) return;
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return;

    const currentVehicle = placeholderVehicles[vehicleIndex];
    const pIndex = currentVehicle.paperwork?.findIndex(p => p.id === paperworkId);

    if (pIndex !== undefined && pIndex > -1) {
        currentVehicle.paperwork![pIndex].status = currentVehicle.paperwork![pIndex].status === 'Pendiente' ? 'Completado' : 'Pendiente';
        await persistToFirestore(['vehicles']);
        setVehicle({ ...currentVehicle });
    }
  }, [vehicle, vehicleId]);
  
  const handleDeletePaperwork = useCallback(async (paperworkId: string) => {
    if (!vehicle) return;
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return;
    
    const currentVehicle = placeholderVehicles[vehicleIndex];
    if (currentVehicle.paperwork) {
        currentVehicle.paperwork = currentVehicle.paperwork.filter(p => p.id !== paperworkId);
        await persistToFirestore(['vehicles']);
        setVehicle({ ...currentVehicle });
        toast({ title: "Trámite Eliminado" });
    }
  }, [vehicle, vehicleId, toast]);
  
  const handleSaveVehicle = async (formData: VehicleFormValues) => {
    if (!vehicle) return;

    const updatedVehicleData: Partial<Vehicle> = {
        ...formData,
        year: Number(formData.year),
        dailyRentalCost: formData.dailyRentalCost ? Number(formData.dailyRentalCost) : undefined,
        gpsMonthlyCost: formData.gpsMonthlyCost ? Number(formData.gpsMonthlyCost) : undefined,
        adminMonthlyCost: formData.adminMonthlyCost ? Number(formData.adminMonthlyCost) : undefined,
        insuranceMonthlyCost: formData.insuranceMonthlyCost ? Number(formData.insuranceMonthlyCost) : undefined,
    };
    
    const updatedVehicle = { ...vehicle, ...updatedVehicleData } as Vehicle;
    setVehicle(updatedVehicle);

    const pIndex = placeholderVehicles.findIndex(v => v.id === updatedVehicle.id);
    if (pIndex !== -1) {
      placeholderVehicles[pIndex] = updatedVehicle;
    }
    
    await persistToFirestore(['vehicles']);

    setIsVehicleEditDialogOpen(false);
    toast({
      title: "Vehículo Actualizado",
      description: `Los datos de ${updatedVehicle.make} ${updatedVehicle.model} han sido actualizados.`,
    });
  };


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
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Quitar de Flotilla
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Quitar de la flotilla?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción quitará el vehículo de la flotilla, pero no lo eliminará del registro general de vehículos. ¿Estás seguro?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveFromFleet} className="bg-destructive hover:bg-destructive/90">
                    Sí, Quitar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4"/> Volver
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="maintenances">Mantenimientos</TabsTrigger>
          <TabsTrigger value="fines">Multas</TabsTrigger>
          <TabsTrigger value="paperwork">Trámites</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
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
                  <p className="font-medium text-muted-foreground flex items-center gap-2"><Gauge className="h-4 w-4" />Kilometraje Actual</p>
                  <p className="font-semibold text-base">{vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString('es-ES')} km` : 'N/A'}</p>
                  {vehicle.lastMileageUpdate && <p className="text-xs text-muted-foreground">Últ. act: {format(parseISO(vehicle.lastMileageUpdate), "dd MMM yyyy", { locale: es })}</p>}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Propietario</p>
                  <p>{vehicle.ownerName}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="font-medium text-muted-foreground">Notas</p>
                  <p className="whitespace-pre-wrap">{vehicle.notes || 'Sin notas.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Costos y Deducciones Fijas</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsVehicleEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">RENTA DIARIA</p>
                <p className="text-lg font-bold">{formatCurrency(vehicle.dailyRentalCost || 0)}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">GPS (MENSUAL)</p>
                <p className="text-lg font-bold">{formatCurrency(vehicle.gpsMonthlyCost || 0)}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">ADMIN (MENSUAL)</p>
                <p className="text-lg font-bold">{formatCurrency(vehicle.adminMonthlyCost || 0)}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">SEGURO (MENSUAL)</p>
                <p className="text-lg font-bold">{formatCurrency(vehicle.insuranceMonthlyCost || 0)}</p>
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
                            <p className="text-sm text-muted-foreground">Costo Total del Mes</p>
                            <p className="text-lg font-bold text-destructive">-${monthData.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-black"><TableRow><TableHead className="text-white">Fecha</TableHead><TableHead className="text-white">Kilometraje</TableHead><TableHead className="text-white">Servicio</TableHead><TableHead className="text-right text-white">Costo</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {monthData.services.sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate))).map(service => (
                          <TableRow key={service.id} onClick={() => handleOpenService(service)} className="cursor-pointer">
                            <TableCell>{format(parseISO(service.serviceDate), "dd MMM, HH:mm", { locale: es })}</TableCell>
                            <TableCell>{service.mileage?.toLocaleString('es-ES')} km</TableCell>
                            <TableCell>{service.description}</TableCell>
                            <TableCell className="text-right text-destructive">-${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
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
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-black"><TableRow><TableHead className="text-white">Fecha de Revisión</TableHead><TableHead className="text-white">Revisado por</TableHead></TableRow></TableHeader>
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

        <TabsContent value="paperwork">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Trámites y Vencimientos</CardTitle>
                <CardDescription>Gestiona los documentos y pagos pendientes del vehículo.</CardDescription>
              </div>
              <Button onClick={() => handleOpenPaperworkDialog()}>
                <PlusCircle className="mr-2 h-4 w-4"/> Añadir Trámite
              </Button>
            </CardHeader>
            <CardContent>
              {vehicle.paperwork && vehicle.paperwork.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-black">
                      <TableRow>
                        <TableHead className="text-white">Estado</TableHead>
                        <TableHead className="text-white">Trámite</TableHead>
                        <TableHead className="text-white">Fecha de Vencimiento</TableHead>
                        <TableHead className="text-right text-white">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicle.paperwork.sort((a,b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate))).map(p => {
                        const isOverdue = p.status === 'Pendiente' && isPast(parseISO(p.dueDate));
                        return (
                          <TableRow key={p.id} className={cn(isOverdue && "bg-destructive/10")}>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleTogglePaperworkStatus(p.id)}>
                                {p.status === 'Completado' ? <CheckCircle className="h-5 w-5 text-green-500"/> : <Circle className="h-5 w-5 text-muted-foreground" />}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <p className="font-semibold">{p.name}</p>
                              {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                            </TableCell>
                            <TableCell className={cn(isOverdue && "font-bold text-destructive")}>
                              {format(parseISO(p.dueDate), "dd MMM, yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenPaperworkDialog(p)}><Edit className="h-4 w-4"/></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePaperwork(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay trámites registrados para este vehículo.</p>
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
      
      <PaperworkDialog
        open={isPaperworkDialogOpen}
        onOpenChange={setIsPaperworkDialogOpen}
        paperwork={editingPaperwork}
        onSave={handleSavePaperwork}
      />
      
      <VehicleDialog
        open={isVehicleEditDialogOpen}
        onOpenChange={setIsVehicleEditDialogOpen}
        vehicle={vehicle}
        onSave={handleSaveVehicle}
      />
    </div>
  );
}
