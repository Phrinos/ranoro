
"use client";

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, User, Edit, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { persistToFirestore, placeholderDrivers, placeholderVehicles } from '@/lib/placeholder-data';
import type { Driver, Vehicle } from '@/types';
import { DriverDialog } from './components/driver-dialog';
import type { DriverFormValues } from './components/driver-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ConductoresPage() {
  const [drivers, setDrivers] = useState<Driver[]>(placeholderDrivers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim()) return drivers;
    const lowerSearch = searchTerm.toLowerCase();
    return drivers.filter(driver =>
      driver.name.toLowerCase().includes(lowerSearch) ||
      driver.phone.toLowerCase().includes(lowerSearch)
    );
  }, [drivers, searchTerm]);

  const handleOpenDialog = useCallback((driver: Driver | null = null) => {
    setEditingDriver(driver);
    setIsDialogOpen(true);
  }, []);

  const handleSaveDriver = useCallback(async (formData: DriverFormValues) => {
    let updatedList: Driver[];

    if (editingDriver) {
      updatedList = drivers.map(d => d.id === editingDriver.id ? { ...editingDriver, ...formData } : d);
      toast({ title: "Conductor Actualizado", description: `Los datos de ${formData.name} han sido actualizados.` });
    } else {
      const newDriver: Driver = { id: `DRV_${Date.now().toString(36)}`, ...formData };
      updatedList = [...drivers, newDriver];
      toast({ title: "Conductor Creado", description: `Se ha registrado a ${formData.name}.` });
    }
    setDrivers(updatedList);
    placeholderDrivers.splice(0, placeholderDrivers.length, ...updatedList);
    await persistToFirestore(['drivers']);
    setIsDialogOpen(false);
  }, [editingDriver, drivers, toast]);

  const handleDeleteDriver = useCallback(async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    const updatedList = drivers.filter(d => d.id !== driverId);
    setDrivers(updatedList);
    placeholderDrivers.splice(0, placeholderDrivers.length, ...updatedList);
    await persistToFirestore(['drivers']);
    toast({ title: "Conductor Eliminado", description: `Se ha eliminado a ${driver.name}.`, variant: "destructive" });
    setDriverToDelete(null);
  }, [drivers, toast]);

  const getVehicleLicensePlate = (vehicleId?: string): string => {
    if (!vehicleId) return 'N/A';
    const vehicle = placeholderVehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.licensePlate : 'Vehículo no encontrado';
  };

  return (
    <>
      <PageHeader
        title="Conductores"
        description="Gestiona la información de los conductores de la flotilla."
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Conductor
          </Button>
        }
      />
      <div className="mb-6 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full rounded-lg bg-card pl-8 md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Vehículo Asignado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrivers.length > 0 ? filteredDrivers.map(driver => (
              <TableRow key={driver.id} className="cursor-pointer" onClick={() => router.push(`/conductores/${driver.id}`)}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell>{driver.phone}</TableCell>
                <TableCell>{getVehicleLicensePlate(driver.assignedVehicleId)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDialog(driver); }} className="mr-2">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDriverToDelete(driver); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    {driverToDelete?.id === driver.id && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar Conductor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. ¿Seguro que quieres eliminar a {driverToDelete.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setDriverToDelete(null); }}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => { e.stopPropagation(); handleDeleteDriver(driver.id); }}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Sí, Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} className="text-center h-24">No se encontraron conductores.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DriverDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        driver={editingDriver}
        onSave={handleSaveDriver}
      />
    </>
  );
}
