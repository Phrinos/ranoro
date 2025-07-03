
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
import type { Technician } from "@/types";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TechniciansTableProps {
  technicians: Technician[];
}

export const TechniciansTable = React.memo(({ technicians: initialTechnicians }: TechniciansTableProps) => {
  const router = useRouter();

  const handleRowClick = (technicianId: string) => {
    router.push(`/tecnicos/${technicianId}`);
  };

  if (!initialTechnicians.length) {
    return <p className="text-muted-foreground text-center py-8">No hay técnicos registrados.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow>
            <TableHead className="font-bold text-white">ID</TableHead>
            <TableHead className="font-bold text-white">Área</TableHead>
            <TableHead className="font-bold text-white">Nombre</TableHead>
            <TableHead className="font-bold text-white">Teléfono</TableHead>
            <TableHead className="font-bold text-white">Especialidad</TableHead>
            <TableHead className="font-bold text-white">Fecha Contratación</TableHead>
            <TableHead className="text-right font-bold text-white">Sueldo Mensual</TableHead>
            <TableHead className="font-bold text-white">Notas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialTechnicians.map((technician) => (
            <TableRow 
              key={technician.id} 
              onClick={() => handleRowClick(technician.id)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{technician.id}</TableCell>
              <TableCell>{technician.area}</TableCell>
              <TableCell className="font-semibold">{technician.name}</TableCell>
              <TableCell>{technician.contactInfo || 'N/A'}</TableCell>
              <TableCell>{technician.specialty}</TableCell>
              <TableCell>{technician.hireDate ? format(parseISO(technician.hireDate), "dd MMM yyyy", { locale: es }) : 'N/A'}</TableCell>
              <TableCell className="text-right">${(technician.monthlySalary || 0).toLocaleString('es-ES')}</TableCell>
              <TableCell>{technician.notes || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

TechniciansTable.displayName = 'TechniciansTable';
