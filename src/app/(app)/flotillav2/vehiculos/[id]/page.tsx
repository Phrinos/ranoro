
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Trash2, Info, FileText, Wrench } from 'lucide-react';
import { inventoryService, personnelService, serviceService } from '@/lib/services';
import type { Vehicle, Driver, ServiceRecord, FineCheck } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AssignDriverCard } from '../../components/AssignDriverCard';
import { VehicleInfoCard } from '../../components/VehicleInfoCard';
import { RentalSystemCard } from '../../components/RentalSystemCard';
import { MaintenanceCard } from '../../components/MaintenanceCard';
import { FineCheckCard } from '../../components/FineCheckCard';
import { VehicleDocumentsCard } from '../../components/VehicleDocumentsCard';

import { EditVehicleInfoDialog } from '../../components/EditVehicleInfoDialog';
import { EditRentalSystemDialog } from '../../components/EditRentalSystemDialog';
import { FineCheckDialog } from '../../components/FineCheckDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getStatusInfo } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';

export default function VehicleProfilePageV2() {
  const params = useParams();
  const vehicleId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isRentalOpen, setIsRentalOpen] = useState(false);
  const [isFineOpen, setIsFineOpen] = useState(false);
  
  const [viewingFineCheck, setViewingFineCheck] = useState<FineCheck | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [isServicePreviewOpen, setIsServicePreviewOpen] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    setIsLoading(true);

    const unsubVeh = inventoryService.onVehiclesUpdate(list => {
      const v = list.find(x => x.id === vehicleId);
      if (v) setVehicle(v);
      setIsLoading(false);
    });

    const unsubDrivers = personnelService.onDriversUpdate(setAllDrivers);
    const unsubServices = serviceService.onServicesForVehicleUpdate(vehicleId, setServiceHistory);

    return () => {
        unsubVeh();
        unsubDrivers();
        unsubServices();
    };
  }, [vehicleId]);

  const handleSaveVehicleInfo = async (data: any) => {
    if (!vehicle) return;
    await inventoryService.saveVehicle(data, vehicle.id);
    toast({ title: "Información Actualizada" });
    setIsInfoOpen(false);
  };

  const handleSaveRentalSystem = async (data: any) => {
    if (!vehicle) return;
    await inventoryService.saveVehicle(data, vehicle.id);
    toast({ title: "Sistema de Renta Actualizado" });
    setIsRentalOpen(false);
  };
  
  const handleSaveFineCheck = async (fines: any[]) => {
    if (!vehicle) return;
    const fineCheckData = { 
        checkDate: new Date().toISOString(),
        status: fines.length > 0 ? "Con Multas" : "Sin Multas",
        fines: fines.map((f:any) => ({...f, date: typeof f.date === 'string' ? f.date : f.date.toISOString()}))
    };
    await inventoryService.saveFineCheck(vehicle.id, fineCheckData as any, viewingFineCheck?.id);
    toast({ title: "Revisión Guardada" });
    setIsFineOpen(false);
    setViewingFineCheck(null);
  };

  const handleRemoveFromFleet = async () => {
    if (!vehicle) return;
    await inventoryService.saveVehicle({ isFleetVehicle: false }, vehicle.id);
    toast({ title: 'Vehículo Removido de la Flotilla' });
    router.push('/flotillav2?tab=vehiculos');
  };

  if (isLoading || !vehicle) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
        description="Gestión técnica y administrativa de la unidad en flota."
        actions={
          <div className="flex gap-2">
            <ConfirmDialog
              triggerButton={<Button variant="destructive" size="sm" className="bg-white border-red-500 text-red-600 hover:bg-red-50 font-bold"><Trash2 className="mr-2 h-4 w-4"/>Quitar de Flotilla</Button>}
              title="¿Quitar de la Flotilla?"
              description="El vehículo ya no aparecerá en la sección de flotilla."
              onConfirm={handleRemoveFromFleet}
            />
            <Button variant="outline" size="sm" onClick={() => router.push('/flotillav2?tab=vehiculos')} className="bg-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6">
          <TabsTrigger value="details" className="gap-2">
            <Info className="h-4 w-4" /> Detalles
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="h-4 w-4" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" /> Mantenimiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Tarjeta de información principal arriba sola */}
          <VehicleInfoCard vehicle={vehicle} onEdit={() => setIsInfoOpen(true)} />
          
          {/* Sistema de renta a la izquierda y conductor a la derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RentalSystemCard vehicle={vehicle} onEdit={() => setIsRentalOpen(true)} />
            <AssignDriverCard vehicle={vehicle} allDrivers={allDrivers} onAssignmentChange={() => {}} />
          </div>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VehicleDocumentsCard vehicle={vehicle} />
            <FineCheckCard 
              vehicle={vehicle} 
              onAdd={() => { setViewingFineCheck(null); setIsFineOpen(true); }}
              onView={(fc) => { setViewingFineCheck(fc); setIsFineOpen(true); }}
            />
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {/* Tarjeta de mantenimiento arriba */}
          <MaintenanceCard vehicle={vehicle} serviceHistory={serviceHistory} />
          
          {/* Historial abajo */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Servicios en Taller</CardTitle>
              <CardDescription>Registro cronológico de intervenciones mecánicas realizadas en el establecimiento.</CardDescription>
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
                      const sDate = parseDate(s.deliveryDateTime || s.serviceDate);
                      return (
                        <TableRow 
                          key={s.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => { setSelectedService(s); setIsServicePreviewOpen(true); }}
                        >
                          <TableCell className="font-mono text-xs">{s.folio || s.id.slice(-6)}</TableCell>
                          <TableCell>{sDate ? format(sDate, "dd/MM/yy", { locale: es }) : '—'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{s.serviceItems?.[0]?.name || s.description || '—'}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(s.totalCost || 0)}</TableCell>
                          <TableCell><Badge variant={statusInfo.color as any}>{s.status}</Badge></TableCell>
                        </TableRow>
                      )
                    }) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Sin servicios registrados.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs de edición */}
      <EditVehicleInfoDialog open={isInfoOpen} onOpenChange={setIsInfoOpen} vehicle={vehicle} onSave={handleSaveVehicleInfo} />
      <EditRentalSystemDialog open={isRentalOpen} onOpenChange={setIsRentalOpen} vehicle={vehicle} onSave={handleSaveRentalSystem} />
      <FineCheckDialog 
        open={isFineOpen} 
        onOpenChange={setIsFineOpen} 
        fines={viewingFineCheck?.fines || []} 
        onSave={handleSaveFineCheck} 
      />

      {selectedService && (
        <UnifiedPreviewDialog
          open={isServicePreviewOpen}
          onOpenChange={setIsServicePreviewOpen}
          title="Resumen de Servicio"
          service={selectedService}
        >
          <div className="hidden" />
        </UnifiedPreviewDialog>
      )}
    </div>
  );
}
