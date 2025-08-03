

"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, CheckCircle, Circle, Edit, Trash2, FileText } from 'lucide-react';
import type { Vehicle, VehiclePaperwork } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { persistToFirestore } from '@/lib/placeholder-data';
import { PaperworkDialog } from '../../components/paperwork-dialog';
import type { PaperworkFormValues } from '../../components/paperwork-form';
import { format, parseISO, compareAsc, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { placeholderVehicles } from '@/lib/placeholder-data';

interface PaperworkTabContentProps {
  vehicle: Vehicle;
  setVehicle: React.Dispatch<React.SetStateAction<Vehicle | null | undefined>>;
}

export function PaperworkTabContent({ vehicle, setVehicle }: PaperworkTabContentProps) {
  const { toast } = useToast();
  const [isPaperworkDialogOpen, setIsPaperworkDialogOpen] = useState(false);
  const [editingPaperwork, setEditingPaperwork] = useState<VehiclePaperwork | null>(null);

  const handleOpenPaperworkDialog = (paperwork?: VehiclePaperwork) => {
    setEditingPaperwork(paperwork || null);
    setIsPaperworkDialogOpen(true);
  };

  const handleSavePaperwork = useCallback(async (values: PaperworkFormValues) => {
    if (!vehicle) return;
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
    if (vehicleIndex === -1) return;

    const currentVehicle = placeholderVehicles[vehicleIndex];
    if (!currentVehicle.paperwork) {
      currentVehicle.paperwork = [];
    }

    if (editingPaperwork) {
      const pIndex = currentVehicle.paperwork.findIndex(p => p.id === editingPaperwork.id);
      if (pIndex !== -1) {
        currentVehicle.paperwork[pIndex] = { ...currentVehicle.paperwork[pIndex], name: values.name, dueDate: values.dueDate.toISOString(), notes: values.notes };
      }
    } else {
      currentVehicle.paperwork.push({ id: `doc_${Date.now()}`, name: values.name, dueDate: values.dueDate.toISOString(), status: 'Pendiente', notes: values.notes });
    }
    
    await persistToFirestore(['vehicles']);
    setVehicle({ ...currentVehicle });
    setIsPaperworkDialogOpen(false);
    toast({ title: "Trámite Guardado", description: "La lista de trámites ha sido actualizada." });
  }, [vehicle, editingPaperwork, toast, setVehicle]);

  const handleTogglePaperworkStatus = useCallback(async (paperworkId: string) => {
    if (!vehicle) return;
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
    if (vehicleIndex === -1) return;

    const currentVehicle = placeholderVehicles[vehicleIndex];
    const pIndex = currentVehicle.paperwork?.findIndex(p => p.id === paperworkId);

    if (pIndex !== undefined && pIndex > -1) {
        currentVehicle.paperwork![pIndex].status = currentVehicle.paperwork![pIndex].status === 'Pendiente' ? 'Completado' : 'Pendiente';
        await persistToFirestore(['vehicles']);
        setVehicle({ ...currentVehicle });
    }
  }, [vehicle, setVehicle]);
  
  const handleDeletePaperwork = useCallback(async (paperworkId: string) => {
    if (!vehicle) return;
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
    if (vehicleIndex === -1) return;
    
    const currentVehicle = placeholderVehicles[vehicleIndex];
    if (currentVehicle.paperwork) {
        currentVehicle.paperwork = currentVehicle.paperwork.filter(p => p.id !== paperworkId);
        await persistToFirestore(['vehicles']);
        setVehicle({ ...currentVehicle });
        toast({ title: "Trámite Eliminado" });
    }
  }, [vehicle, toast, setVehicle]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Trámites y Vencimientos</CardTitle>
            <CardDescription>Gestiona los documentos y pagos pendientes del vehículo.</CardDescription>
          </div>
          <Button onClick={() => handleOpenPaperworkDialog()}>
            <PlusCircle className="mr-2 h-4 w-4"/> Añadir Trámite
          </Button>
        </CardHeader>
        <CardContent>
          {vehicle.paperwork && vehicle.paperwork.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="text-white">Estado</TableHead>
                    <TableHead className="text-white">Trámite</TableHead>
                    <TableHead className="text-white">Fecha de Vencimiento</TableHead>
                    <TableHead className="text-right text-white">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicle.paperwork.sort((a,b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate))).map(p => {
                    const isOverdue = p.status === 'Pendiente' && isPast(parseISO(p.dueDate));
                    return (
                      <TableRow key={p.id} className={cn(isOverdue && "bg-destructive/10")}>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleTogglePaperworkStatus(p.id)}>
                            {p.status === 'Completado' ? <CheckCircle className="h-5 w-5 text-green-500"/> : <Circle className="h-5 w-5 text-muted-foreground" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{p.name}</p>
                          {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                        </TableCell>
                        <TableCell className={cn(isOverdue && "font-bold text-destructive")}>
                          {format(parseISO(p.dueDate), "dd MMM, yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPaperworkDialog(p)}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePaperwork(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 mb-2" />
                <h3 className="text-lg font-semibold text-foreground">Sin Trámites Registrados</h3>
                <p className="text-sm">Añada trámites como verificaciones, tenencias, etc.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <PaperworkDialog
        open={isPaperworkDialogOpen}
        onOpenChange={setIsPaperworkDialogOpen}
        paperwork={editingPaperwork}
        onSave={handleSavePaperwork}
      />
    </>
  );
}
