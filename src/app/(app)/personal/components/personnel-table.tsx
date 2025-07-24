
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Archive, Users } from "lucide-react";
import type { Personnel } from "@/types";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface PersonnelTableProps {
  personnel: Personnel[];
  onEdit: (person: Personnel) => void;
  onArchive: (person: Personnel) => void;
}

export const PersonnelTable = React.memo(({ personnel, onEdit, onArchive }: PersonnelTableProps) => {

  if (!personnel.length) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Users className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No se encontró personal</h3>
            <p className="text-sm">Intente cambiar su búsqueda o agregue nuevo personal.</p>
        </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-black">
          <TableRow>
            <TableHead className="font-bold text-white">Nombre</TableHead>
            <TableHead className="font-bold text-white">Roles</TableHead>
            <TableHead className="font-bold text-white">Contacto</TableHead>
            <TableHead className="text-right font-bold text-white">Sueldo Base</TableHead>
            <TableHead className="text-right font-bold text-white">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personnel.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="font-medium">{person.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                    {person.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                </div>
              </TableCell>
              <TableCell>{person.contactInfo || 'N/A'}</TableCell>
              <TableCell className="text-right">${(person.monthlySalary || 0).toLocaleString('es-ES')}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(person)} className="mr-2">
                  <Edit className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                    triggerButton={
                        <Button variant="ghost" size="icon">
                            <Archive className="h-4 w-4 text-orange-600" />
                        </Button>
                    }
                    title={`¿${person.isArchived ? 'Restaurar' : 'Archivar'} personal?`}
                    description={`¿Seguro que quieres ${person.isArchived ? 'restaurar' : 'archivar'} a ${person.name}?`}
                    onConfirm={() => onArchive(person)}
                    confirmText={person.isArchived ? 'Sí, Restaurar' : 'Sí, Archivar'}
                    variant={person.isArchived ? 'default' : 'destructive'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

PersonnelTable.displayName = 'PersonnelTable';
