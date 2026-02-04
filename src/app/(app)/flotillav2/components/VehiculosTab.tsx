
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Search } from 'lucide-react';
import type { Vehicle } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { VehicleSelectionDialog } from '@/app/(app)/servicios/components/VehicleSelectionDialog';
import { VehicleDialog } from '@/app/(app)/vehiculos/components/vehicle-dialog';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

interface VehiculosTabProps {
  vehicles: Vehicle[];
}

export default function VehiculosTab({ vehicles }: VehiculosTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('licensePlate_asc');
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false);

  const fleetVehicles = vehicles.filter(v => v.isFleetVehicle);
  const filtered = fleetVehicles.filter(v => 
    v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a: any, b: any) => {
    const [key, direction] = sortOption.split('_');
    const valA = a[key] || '';
    const valB = b[key] || '';
    const cmp = String(valA).localeCompare(String(valB), 'es', { numeric: true });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa o modelo..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsSelectionOpen(true)} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Unidad
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="licensePlate" label="Placa" onSort={k => setSortOption(`${k}_${sortOption.endsWith('asc') ? 'desc' : 'asc'}`)} currentSort={sortOption} textClassName="text-white" />
                  <TableHead className="text-white">Unidad</TableHead>
                  <TableHead className="text-white">Conductor</TableHead>
                  <TableHead className="text-white text-right">Renta Diaria</TableHead>
                  <TableHead className="text-white text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(v => (
                  <TableRow 
                    key={v.id} 
                    onClick={() => router.push(`/flotillav2/vehiculos/${v.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-bold">{v.licensePlate}</TableCell>
                    <TableCell>{v.make} {v.model} ({v.year})</TableCell>
                    <TableCell>
                      {v.assignedDriverName || <Badge variant="outline">Disponible</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {v.dailyRentalCost ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v.dailyRentalCost) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="h-4 w-4 inline-block text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
