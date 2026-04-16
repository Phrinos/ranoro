
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, EyeOff, Search, MoreVertical, Archive, ArchiveRestore, Edit, Car, Unlink } from 'lucide-react';
import type { Driver, Vehicle } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { DriverDialog } from './DriverDialog';
import { personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConductoresTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
}

export default function ConductoresTab({ drivers, vehicles }: ConductoresTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortOption, setSortOption] = useState('name_asc');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filtered = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (d.phone || '').includes(searchTerm);
    const matchesStatus = showArchived ? true : !d.isArchived;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a: any, b: any) => {
    const [key, direction] = sortOption.split('_');
    const valA = a[key] || '';
    const valB = b[key] || '';
    const cmp = String(valA).localeCompare(String(valB), 'es', { numeric: true });
    return direction === 'asc' ? cmp : -cmp;
  });

  const handleSaveDriver = async (data: any) => {
    try {
      await personnelService.saveDriver({ ...data, isArchived: false });
      toast({ title: "Conductor creado" });
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: "Error al crear conductor", variant: "destructive" });
    }
  };

  const handleArchiveDriver = async (driver: Driver) => {
    await personnelService.saveDriver({ isArchived: !driver.isArchived }, driver.id);
    toast({ title: `Conductor ${driver.isArchived ? 'restaurado' : 'archivado'}` });
  };

  const handleUnlinkDriver = async (driver: Driver) => {
    if (!driver.assignedVehicleId) return;
    const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
    if (!vehicle) return;
    await personnelService.assignVehicleToDriver(vehicle, null, drivers);
    toast({ title: "Vehículo desvinculado", description: `${driver.name} ya no tiene vehículo asignado.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conductor..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
            {showArchived ? 'Ocultar Inactivos' : 'Ver Inactivos'}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Conductor
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-900">
                <TableRow>
                  <SortableTableHeader sortKey="name" label="Nombre" onSort={k => setSortOption(`${k}_${sortOption.endsWith('asc') ? 'desc' : 'asc'}`)} currentSort={sortOption} textClassName="text-white" />
                  <TableHead className="text-white text-xs font-semibold">Teléfono</TableHead>
                  <TableHead className="text-white text-xs font-semibold">Vehículo Asignado</TableHead>
                  <TableHead className="text-white text-xs font-semibold">Estado</TableHead>
                  <TableHead className="text-white text-xs font-semibold text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(driver => {
                  const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
                  return (
                    <TableRow 
                      key={driver.id} 
                      className={cn("hover:bg-muted/50", driver.isArchived && "opacity-50 bg-muted/20")}
                    >
                      <TableCell 
                        className="font-semibold cursor-pointer"
                        onClick={() => router.push(`/flotillav2/conductores/${driver.id}`)}
                      >
                        {driver.name}
                      </TableCell>
                      <TableCell className="text-sm">{driver.phone || '—'}</TableCell>
                      <TableCell>
                        {vehicle ? (
                          <div className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono text-xs font-bold">{vehicle.licensePlate}</span>
                            <span className="text-[11px] text-muted-foreground ml-1">{vehicle.make} {vehicle.model}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Sin vehículo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.isArchived ? (
                          <Badge variant="secondary">Inactivo</Badge>
                        ) : driver.assignedVehicleId ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">Disponible</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/flotillav2/conductores/${driver.id}`)}>
                              <Edit className="mr-2 h-4 w-4" /> Ver / Editar
                            </DropdownMenuItem>
                            {driver.assignedVehicleId && (
                              <DropdownMenuItem className="text-amber-600" onClick={() => handleUnlinkDriver(driver)}>
                                <Unlink className="mr-2 h-4 w-4" /> Desvincular Vehículo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className={driver.isArchived ? "text-green-600" : "text-destructive"}
                              onClick={() => handleArchiveDriver(driver)}
                            >
                              {driver.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                              {driver.isArchived ? "Restaurar" : "Archivar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No se encontraron conductores.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DriverDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleSaveDriver} />
    </div>
  );
}
