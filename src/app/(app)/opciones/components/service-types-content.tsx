
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { ServiceTypeRecord } from '@/types';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { capitalizeWords } from '@/lib/utils';

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

    const handleSaveType = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = currentTypeName.trim();
        if (!trimmedName) return toast({ title: "Nombre vacío", variant: "destructive" });

        const isDuplicate = serviceTypes.some(t => t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editingType?.id);
        if (isDuplicate) return toast({ title: "Tipo de servicio duplicado", variant: "destructive" });

        try {
            await inventoryService.saveServiceType({ name: trimmedName }, editingType?.id);
            toast({ title: `Tipo de servicio ${editingType ? 'actualizado' : 'creado'}.` });
            setIsDialogOpen(false);
            // The parent component will receive the update via the onSnapshot listener
        } catch (error) {
            console.error("Error saving service type:", error);
            toast({ title: "Error al guardar", variant: "destructive" });
        }
    };

    const handleDeleteType = async (type: ServiceTypeRecord) => {
        if (window.confirm(`¿Seguro que quieres eliminar "${type.name}"?`)) {
            try {
                await inventoryService.deleteServiceType(type.id);
                toast({ title: "Tipo de servicio eliminado.", variant: "destructive" });
            } catch (error) {
                console.error("Error deleting service type:", error);
                toast({ title: "Error al eliminar", variant: "destructive" });
            }
        }
    };
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tipos de Servicio</CardTitle>
                    <CardDescription>Gestiona las categorías de servicios que ofreces en tu taller.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Tipo</Button>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {serviceTypes.length > 0 ? (
                                serviceTypes.map(type => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(type)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={2} className="h-24 text-center">No hay tipos de servicio definidos.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingType ? 'Editar' : 'Nuevo'} Tipo de Servicio</DialogTitle></DialogHeader>
                    <form onSubmit={handleSaveType} className="py-4 space-y-4">
                        <Label htmlFor="type-name">Nombre del Tipo de Servicio</Label>
                        <Input id="type-name" value={currentTypeName} onChange={(e) => setCurrentTypeName(capitalizeWords(e.target.value))} />
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
