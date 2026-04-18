
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, MoreVertical, Users, Unlink, Edit, DollarSign, Trash2 } from 'lucide-react';
import type { Vehicle, Driver } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { VehicleSelectorDialog as VehicleSelectionDialog } from '@/app/(app)/servicios/components/dialogs/vehicle-selector-dialog';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { inventoryService, personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VehiculosTabProps {
  vehicles: Vehicle[];
  drivers: Driver[];
}

export default function VehiculosTab({ vehicles, drivers }: VehiculosTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('licensePlate_asc');
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false);
  const [assignVehicleId, setAssignVehicleId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const fleetVehicles = vehicles.filter(v => v.isFleetVehicle);
  const filtered = fleetVehicles.filter(v => 
    v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.assignedDriverName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a: any, b: any) => {
    const [key, direction] = sortOption.split('_');
    const valA = a[key] || '';
    const valB = b[key] || '';
    const cmp = typeof valA === 'number' && typeof valB === 'number' 
      ? valA - valB 
      : String(valA).localeCompare(String(valB), 'es', { numeric: true });
    return direction === 'asc' ? cmp : -cmp;
  });

  const handleAddVehicleToFleet = async (vehicleId: string) => {
    try {
      await inventoryService.saveVehicle({ isFleetVehicle: true }, vehicleId);
      toast({ title: 'Vehículo añadido a la flotilla' });
      setIsSelectionOpen(false);
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleSaveNewVehicle = async (data: any) => {
    try {
      await inventoryService.saveVehicle({ ...data, isFleetVehicle: true });
      toast({ title: 'Vehículo creado y añadido' });
      setIsNewVehicleOpen(false);
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleUnlinkVehicle = async (vehicle: Vehicle) => {
    if (!vehicle.assignedDriverId) return;
    await personnelService.assignVehicleToDriver(vehicle, null, drivers);
    toast({ title: "Conductor desvinculado", description: `${vehicle.licensePlate} ahora está disponible.` });
  };

  const handleRemoveFromFleet = async (vehicleId: string) => {
    await inventoryService.saveVehicle({ isFleetVehicle: false }, vehicleId);
    toast({ title: "Vehículo removido de la flotilla" });
  };

  const handleAssignDriver = async () => {
    if (!assignVehicleId || !selectedDriverId) return;
    const vehicle = vehicles.find(v => v.id === assignVehicleId);
    if (!vehicle) return;
    await personnelService.assignVehicleToDriver(vehicle, selectedDriverId, drivers);
    toast({ title: "Conductor asignado", description: `${drivers.find(d => d.id === selectedDriverId)?.name} asignado a ${vehicle.licensePlate}.` });
    setAssignVehicleId(null);
    setSelectedDriverId('');
  };

  const availableDrivers = drivers.filter(d => !d.isArchived && !d.assignedVehicleId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, modelo o conductor..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="h-8 px-3 text-sm">
            {fleetVehicles.length} unidades · {fleetVehicles.filter(v => v.assignedDriverId).length} asignadas
          </Badge>
          <Button onClick={() => setIsSelectionOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Unidad
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-900">
                <TableRow>
                  <SortableTableHeader sortKey="licensePlate" label="Placa" onSort={k => setSortOption(`${k}_${sortOption.endsWith('asc') ? 'desc' : 'asc'}`)} currentSort={sortOption} textClassName="text-white" />
                  <TableHead className="text-white text-xs font-semibold">Marca / Modelo / Año</TableHead>
                  <TableHead className="text-white text-xs font-semibold">Conductor</TableHead>
                  <SortableTableHeader sortKey="dailyRentalCost" label="Renta Diaria" onSort={k => setSortOption(`${k}_${sortOption.endsWith('asc') ? 'desc' : 'asc'}`)} currentSort={sortOption} className="text-right" textClassName="text-white" />
                  <TableHead className="text-white text-xs font-semibold text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(v => (
                  <TableRow 
                    key={v.id} 
                    className="hover:bg-muted/50"
                  >
                    <TableCell 
                      className="font-mono font-black text-sm cursor-pointer"
                      onClick={() => router.push(`/flotillav2/vehiculos/${v.id}`)}
                    >
                      {v.licensePlate}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{v.make} {v.model}</span>
                      <span className="text-muted-foreground ml-1 text-xs">({v.year})</span>
                    </TableCell>
                    <TableCell>
                      {v.assignedDriverName ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          <Users className="h-3 w-3 mr-1" /> {v.assignedDriverName}
                        </Badge>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs border-dashed text-muted-foreground"
                          onClick={() => { setAssignVehicleId(v.id); setSelectedDriverId(''); }}
                        >
                          <Users className="h-3 w-3 mr-1" /> Asignar Chofer
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm">
                      {v.dailyRentalCost ? formatCurrency(v.dailyRentalCost) : <span className="text-amber-500 text-xs">Sin costo</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/flotillav2/vehiculos/${v.id}`)}>
                            <Edit className="mr-2 h-4 w-4" /> Ver / Editar
                          </DropdownMenuItem>
                          {v.assignedDriverId ? (
                            <DropdownMenuItem className="text-amber-600" onClick={() => handleUnlinkVehicle(v)}>
                              <Unlink className="mr-2 h-4 w-4" /> Desvincular Conductor
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => { setAssignVehicleId(v.id); setSelectedDriverId(''); }}>
                              <Users className="mr-2 h-4 w-4" /> Asignar Conductor
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveFromFleet(v.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Quitar de Flotilla
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No hay vehículos en la flotilla.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Assign Dialog */}
      <Dialog open={!!assignVehicleId} onOpenChange={(open) => { if (!open) setAssignVehicleId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Conductor</DialogTitle>
            <DialogDescription>
              Selecciona un conductor disponible para asignarlo a {vehicles.find(v => v.id === assignVehicleId)?.licensePlate || 'este vehículo'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar conductor..." />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableDrivers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Todos los conductores ya tienen vehículo asignado.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignVehicleId(null)}>Cancelar</Button>
            <Button disabled={!selectedDriverId} onClick={handleAssignDriver}>Asignar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <VehicleSelectionDialog
        open={isSelectionOpen}
        onOpenChange={setIsSelectionOpen}
        vehicles={vehicles.filter(v => !v.isFleetVehicle)}
        onSelectVehicle={handleAddVehicleToFleet}
        onNewVehicle={() => { setIsSelectionOpen(false); setIsNewVehicleOpen(true); }}
      />

      <VehicleDialog
        open={isNewVehicleOpen}
        onOpenChange={setIsNewVehicleOpen}
        onSave={handleSaveNewVehicle}
      />
    </div>
  );
}
