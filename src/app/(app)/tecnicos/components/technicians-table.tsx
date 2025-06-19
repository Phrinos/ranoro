"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import type { Technician } from "@/types";
import { TechnicianDialog } from './technician-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TechniciansTableProps {
  technicians: Technician[];
}

export function TechniciansTable({ technicians: initialTechnicians }: TechniciansTableProps) {
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const { toast } = useToast();
  
  const handleUpdateTechnician = async (updatedTechnicianData: any) => {
    setTechnicians(prevTechnicians => 
        prevTechnicians.map(t => t.id === updatedTechnicianData.id ? { ...t, ...updatedTechnicianData } : t)
    );
  };

  const handleDeleteTechnician = (technicianId: string) => {
    setTechnicians(prevTechnicians => prevTechnicians.filter(t => t.id !== technicianId));
    toast({
      title: "Técnico Eliminado",
      description: `El técnico con ID ${technicianId} ha sido eliminado.`,
    });
  };

  if (!technicians.length) {
    return <p className="text-muted-foreground text-center py-8">No hay técnicos registrados.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Especialidad</TableHead>
            <TableHead>Servicios Completados</TableHead>
            <TableHead>Ingresos Generados</TableHead>
            <TableHead>Fecha Contratación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {technicians.map((technician) => (
            <TableRow key={technician.id}>
              <TableCell className="font-medium">{technician.id}</TableCell>
              <TableCell>{technician.name}</TableCell>
              <TableCell>{technician.specialty}</TableCell>
              <TableCell>{technician.servicesCompleted || 0}</TableCell>
              <TableCell>${(technician.revenueGenerated || 0).toLocaleString('es-ES')}</TableCell>
              <TableCell>{technician.hireDate ? format(parseISO(technician.hireDate), "dd MMM yyyy", { locale: es }) : 'N/A'}</TableCell>
              <TableCell className="text-right">
                 <TechnicianDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar Técnico">
                      <Edit className="h-4 w-4" />
                    </Button>
                  }
                  technician={technician}
                  onSave={async (data) => handleUpdateTechnician({ ...data, id: technician.id })}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar Técnico">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el perfil del técnico.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTechnician(technician.id)} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
