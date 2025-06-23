
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
import type { AdministrativeStaff } from "@/types";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdministrativeStaffTableProps {
  staffList: AdministrativeStaff[];
}

export function AdministrativeStaffTable({ staffList }: AdministrativeStaffTableProps) {
  const router = useRouter();

  const handleRowClick = (staffId: string) => {
    router.push(`/administrativos/${staffId}`);
  };

  if (!staffList.length) {
    return <p className="text-muted-foreground text-center py-8">No hay personal administrativo registrado.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader className="bg-white">
          <TableRow>
            <TableHead className="font-bold">ID</TableHead>
            <TableHead className="font-bold">Nombre</TableHead>
            <TableHead className="font-bold">Rol/Área</TableHead>
            <TableHead className="font-bold">Teléfono</TableHead>
            <TableHead className="font-bold">Fecha Contratación</TableHead>
            <TableHead className="text-right font-bold">Sueldo Mensual</TableHead>
            <TableHead className="font-bold">Notas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffList.map((staff) => (
            <TableRow 
              key={staff.id} 
              onClick={() => handleRowClick(staff.id)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{staff.id}</TableCell>
              <TableCell className="font-semibold">{staff.name}</TableCell>
              <TableCell>{staff.roleOrArea}</TableCell>
              <TableCell>{staff.contactInfo || 'N/A'}</TableCell>
              <TableCell>{staff.hireDate ? format(parseISO(staff.hireDate), "dd MMM yyyy", { locale: es }) : 'N/A'}</TableCell>
              <TableCell className="text-right">${(staff.monthlySalary || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>{staff.notes || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
