
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Eye, EyeOff, Search } from 'lucide-react';
import type { Driver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { DriverDialog } from './DriverDialog';
import { personnelService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

interface ConductoresTabProps {
  drivers: Driver[];
}

export default function ConductoresTab({ drivers }: ConductoresTabProps) {
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
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="name" label="Nombre" onSort={k => setSortOption(`${k}_${sortOption.endsWith('asc') ? 'desc' : 'asc'}`)} currentSort={sortOption} textClassName="text-white" />
                  <TableHead className="text-white">Teléfono</TableHead>
                  <TableHead className="text-white">Vehículo Asignado</TableHead>
                  <TableHead className="text-white text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(driver => (
                  <TableRow 
                    key={driver.id} 
                    onClick={() => router.push(`/flotillav2/conductores/${driver.id}`)}
                    className={cn("cursor-pointer hover:bg-muted/50", driver.isArchived && "opacity-60 bg-muted/30")}
                  >
                    <TableCell className="font-medium">
                      {driver.name} {driver.isArchived && <Badge variant="secondary" className="ml-2">Inactivo</Badge>}
                    </TableCell>
                    <TableCell>{driver.phone || '—'}</TableCell>
                    <TableCell>{driver.assignedVehicleLicensePlate || <span className="text-muted-foreground italic">Sin asignar</span>}</TableCell>
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

      <DriverDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={handleSaveDriver} />
    </div>
  );
}
