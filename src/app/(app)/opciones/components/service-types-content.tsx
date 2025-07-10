
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
import { persistToFirestore, placeholderServiceTypes, logAudit } from '@/lib/placeholder-data';
import { capitalizeWords } from '@/lib/utils';

export function TiposDeServicioPageContent() {
    const { toast } = useToast();
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<ServiceTypeRecord | null>(null);
    const [currentTypeName, setCurrentTypeName] = useState('');

    useEffect(() => {
        setServiceTypes([...placeholderServiceTypes]);
        setIsLoading(false);
    }, []);

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

        const isNew = !editingType;
        const typeToSave: ServiceTypeRecord = { id: isNew ? `st_${Date.now()}` : editingType.id, name: trimmedName };
        
        const action = isNew ? 'Crear' : 'Editar';
        await logAudit(action, `Se ${action.toLowerCase() === 'crear' ? 'creó el' : 'actualizó el'} tipo de servicio: "${trimmedName}".`, { entityType: 'Servicio', entityId: typeToSave.id });

        if (isNew) {
            placeholderServiceTypes.push(typeToSave);
        } else {
            const index = placeholderServiceTypes.findIndex(t => t.id === typeToSave.id);
            if (index > -1) placeholderServiceTypes[index] = typeToSave;
        }

        await persistToFirestore(['serviceTypes', 'auditLogs']);
        setServiceTypes([...placeholderServiceTypes]);
        toast({ title: `Tipo de servicio ${isNew ? 'creado' : 'actualizado'}.` });
        setIsDialogOpen(false);
    };

    const handleDeleteType = async (type: ServiceTypeRecord) => {
        if (window.confirm(`¿Seguro que quieres eliminar "${type.name}"?`)) {
            await logAudit('Eliminar', `Se eliminó el tipo de servicio: "${type.name}".`, { entityType: 'Servicio', entityId: type.id });
            const index = placeholderServiceTypes.findIndex(t => t.id === type.id);
            if (index > -1) {
                placeholderServiceTypes.splice(index, 1);
                await persistToFirestore(['serviceTypes', 'auditLogs']);
                setServiceTypes([...placeholderServiceTypes]);
                toast({ title: "Tipo de servicio eliminado.", variant: "destructive" });
            }
        }
    };
    
    if (isLoading) return <p>Cargando tipos de servicio...</p>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tipos de Servicio</CardTitle>
                    <CardDescription>Gestiona los tipos de servicios que ofreces en tu taller.</CardDescription>
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
