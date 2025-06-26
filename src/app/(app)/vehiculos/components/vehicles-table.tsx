
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Vehicle } from "@/types";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehiclesTableProps {
  vehicles: Vehicle[];
}

export const VehiclesTable = React.memo(({ vehicles: initialVehicles }: VehiclesTableProps) => {
  const router = useRouter();

  const handleRowClick = (vehicleId: string) => { // Changed id to string to match type
    router.push(`/vehiculos/${vehicleId}`);
  };

  if (!initialVehicles.length) {
    return <p className="text-muted-foreground text-center py-8">No hay vehículos registrados o que coincidan con los filtros.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-white">
          <TableRow>
            <TableHead className="font-bold">Placa</TableHead>
            <TableHead className="font-bold">Marca</TableHead>
            <TableHead className="font-bold">Modelo</TableHead>
            <TableHead className="font-bold">Año</TableHead>
            <TableHead className="font-bold">Propietario</TableHead>
            <TableHead className="font-bold">Teléfono</TableHead>
            <TableHead className="font-bold">Último Servicio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialVehicles.map((vehicle) => (
            <TableRow 
              key={vehicle.id} 
              onClick={() => handleRowClick(vehicle.id)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-semibold">{vehicle.licensePlate}</TableCell>
              <TableCell>{vehicle.make}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell>{vehicle.year}</TableCell>
              <TableCell>{vehicle.ownerName}</TableCell>
              <TableCell>{vehicle.ownerPhone}</TableCell>
              <TableCell>
                {vehicle.lastServiceDate 
                  ? format(parseISO(vehicle.lastServiceDate), "dd MMM yyyy", { locale: es }) 
                  : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

VehiclesTable.displayName = 'VehiclesTable';
