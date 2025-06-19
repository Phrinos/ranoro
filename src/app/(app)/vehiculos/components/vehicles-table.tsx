
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

interface VehiclesTableProps {
  vehicles: Vehicle[];
}

export function VehiclesTable({ vehicles: initialVehicles }: VehiclesTableProps) {
  const router = useRouter();

  const handleRowClick = (vehicleId: number) => {
    router.push(`/vehiculos/${vehicleId}`);
  };

  if (!initialVehicles.length) {
    return <p className="text-muted-foreground text-center py-8">No hay vehículos registrados.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placa</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Año</TableHead>
            <TableHead>Propietario</TableHead>
            <TableHead>Teléfono</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
