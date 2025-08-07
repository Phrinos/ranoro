
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
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Car } from "lucide-react";
import { parseDate } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";

interface VehiclesTableProps {
  vehicles: Vehicle[];
}

export const VehiclesTable = React.memo(({ vehicles }: VehiclesTableProps) => {
  const router = useRouter();

  const handleRowClick = (vehicleId: string) => {
    router.push(`/vehiculos/${vehicleId}`);
  };
  
  if (!vehicles.length) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Car className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No se encontraron vehículos</h3>
            <p className="text-sm">Intente cambiar su búsqueda o agregue un nuevo vehículo.</p>
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow>
            <TableHead className="font-bold text-white">Placa</TableHead>
            <TableHead className="font-bold text-white">Marca</TableHead>
            <TableHead className="font-bold text-white">Modelo</TableHead>
            <TableHead className="font-bold text-white">Año</TableHead>
            <TableHead className="font-bold text-white">Propietario</TableHead>
            <TableHead className="font-bold text-white">Teléfono</TableHead>
            <TableHead className="font-bold text-white">Último Servicio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => {
            const lastServiceDate = parseDate(vehicle.lastServiceDate);
            return (
              <TableRow 
                key={vehicle.id} 
                onClick={() => handleRowClick(vehicle.id)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-semibold">
                  <span>{vehicle.licensePlate}</span>
                  {vehicle.isFleetVehicle && <Badge variant="secondary" className="ml-2">Flotilla</Badge>}
                </TableCell>
                <TableCell>{vehicle.make}</TableCell>
                <TableCell>{vehicle.model}</TableCell>
                <TableCell>{vehicle.year}</TableCell>
                <TableCell>{vehicle.ownerName}</TableCell>
                <TableCell>{vehicle.ownerPhone}</TableCell>
                <TableCell>
                  {lastServiceDate && isValid(lastServiceDate)
                    ? format(lastServiceDate, "dd MMM yyyy", { locale: es }) 
                    : 'N/A'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
});

VehiclesTable.displayName = 'VehiclesTable';
