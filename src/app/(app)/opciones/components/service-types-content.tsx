
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { ServiceTypeRecord } from '@/types';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { capitalizeWords } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface TiposDeServicioProps {
    serviceTypes: ServiceTypeRecord[];
}

export function TiposDeServicioPageContent({ serviceTypes }: TiposDeServicioProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<ServiceTypeRecord | null>(null);
    const [currentTypeName, setCurrentTypeName] = useState('');

    const handleOpenDialog = (type: ServiceTypeRecord | null = null) => {
        setEditingType(type);
        setCurrentTypeName(type ? type.name : '');
        setIsDialogOpen(true);
    };

    const handleSaveType = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = currentTypeName.trim();
        if (!trimmedName) {
            toast({ title: "Nombre vacío", variant: "destructive", description: "El nombre del tipo de servicio no puede estar vacío." });
            return;
        }

        const isDuplicate = serviceTypes.some(t => t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editingType?.id);
        if (isDuplicate) {
            toast({ title: "Tipo de servicio duplicado", variant: "destructive", description: `Ya existe un tipo de servicio con el nombre "${trimmedName}".` });
            return;
        }

        try {
            await inventoryService.saveServiceType({ name: trimmedName }, editingType?.id);
            toast({ title: `Tipo de servicio ${editingType ? 'actualizado' : 'creado'}.`, description: `El tipo de servicio "${trimmedName}" se ha guardado correctamente.` });
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving service type:", error);
            toast({ title: "Error al guardar", variant: "destructive", description: "No se pudo guardar el tipo de servicio. Inténtalo de nuevo." });
        }
    }, [currentTypeName, editingType, serviceTypes, toast]);

    const handleDeleteType = useCallback(async (type: ServiceTypeRecord) => {
        try {
            await inventoryService.deleteServiceType(type.id);
            toast({ title: "Tipo de servicio eliminado.", description: `El tipo de servicio "${type.name}" ha sido eliminado.`, variant: "destructive" });
        } catch (error) {
            console.error("Error deleting service type:", error);
            toast({ title: "Error al eliminar", variant: "destructive", description: "No se pudo eliminar el tipo de servicio. Inténtalo de nuevo." });
        }
    }, [toast]);
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tipos de Servicio</CardTitle>
                    <CardDescription>Gestiona las categorías de los servicios que ofreces.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Tipo</Button>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="text-right w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {serviceTypes.length > 0 ? (
                                serviceTypes.map(type => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(type)} aria-label={`Editar ${type.name}`}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                             <ConfirmDialog
                                                triggerButton={
                                                    <Button variant="ghost" size="icon" aria-label={`Eliminar ${type.name}`}>
                                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                                    </Button>
                                                }
                                                title={`¿Eliminar "${type.name}"?`}
                                                description="Esta acción no se puede deshacer. Los servicios existentes que usen este tipo no serán afectados, pero no podrá ser seleccionado para nuevos servicios."
                                                onConfirm={() => handleDeleteType(type)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        No hay tipos de servicio definidos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Editar' : 'Nuevo'} Tipo de Servicio</DialogTitle>
                         <DialogDescription>
                            Define un nombre claro para la categoría del servicio.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="service-type-form" onSubmit={handleSaveType} className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="type-name">Nombre del Tipo de Servicio</Label>
                            <Input id="type-name" value={currentTypeName} onChange={(e) => setCurrentTypeName(capitalizeWords(e.target.value))} autoFocus />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="service-type-form">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
