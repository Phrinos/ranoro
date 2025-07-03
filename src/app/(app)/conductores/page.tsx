
"use client";

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ListFilter } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { persistToFirestore, placeholderDrivers, placeholderVehicles } from '@/lib/placeholder-data';
import type { Driver } from '@/types';
import { DriverDialog } from './components/driver-dialog';
import type { DriverFormValues } from './components/driver-form';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type DriverSortOption = 'name_asc' | 'name_desc';

export default function ConductoresPage() {
  const [drivers, setDrivers] = useState<Driver[]>(placeholderDrivers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [sortOption, setSortOption] = useState<DriverSortOption>('name_asc');
  const { toast } = useToast();
  const router = useRouter();

  const filteredAndSortedDrivers = useMemo(() => {
    let itemsToDisplay = [...drivers];
    
    if (searchTerm.trim()) {
        const lowerSearch = searchTerm.toLowerCase();
        itemsToDisplay = itemsToDisplay.filter(driver =>
        driver.name.toLowerCase().includes(lowerSearch) ||
        driver.phone.toLowerCase().includes(lowerSearch)
      );
    }

    itemsToDisplay.sort((a, b) => {
        switch (sortOption) {
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'name_asc':
            default:
                return a.name.localeCompare(b.name);
        }
    });

    return itemsToDisplay;
  }, [drivers, searchTerm, sortOption]);

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
      const newDriver: Driver = { id: `DRV_${Date.now().toString(36)}`, ...formData, documents: {} };
      updatedList = [...drivers, newDriver];
      toast({ title: "Conductor Creado", description: `Se ha registrado a ${formData.name}.` });
    }
    setDrivers(updatedList);
    placeholderDrivers.splice(0, placeholderDrivers.length, ...updatedList);
    await persistToFirestore(['drivers']);
    setIsDialogOpen(false);
    setEditingDriver(null);
  }, [editingDriver, drivers, toast]);

  const getVehicleInfo = (vehicleId?: string): string => {
    if (!vehicleId) return 'N/A';
    const vehicle = placeholderVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return 'Vehículo no encontrado';
    return `${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.color || ''}`.trim();
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
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o teléfono..."
            className="w-full rounded-lg bg-card pl-8 sm:w-[300px] lg:w-1/2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-white">
                <ListFilter className="mr-2 h-4 w-4" />
                Organizar Tabla
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as DriverSortOption)}>
                <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Vehículo Asignado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedDrivers.length > 0 ? filteredAndSortedDrivers.map(driver => (
              <TableRow key={driver.id} className="cursor-pointer" onClick={() => router.push(`/conductores/${driver.id}`)}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell>{driver.phone}</TableCell>
                <TableCell>{getVehicleInfo(driver.assignedVehicleId)}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={3} className="text-center h-24">No se encontraron conductores.</TableCell></TableRow>
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
