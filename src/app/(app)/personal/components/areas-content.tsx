
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { Area } from '@/types';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { personnelService } from '@/lib/services';
import { capitalizeWords } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface AreasContentProps {
  areas: Area[];
}

export function AreasContent({ areas }: AreasContentProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [currentAreaName, setCurrentAreaName] = useState('');

    const handleOpenDialog = useCallback((area: Area | null = null) => {
        setEditingArea(area);
        setCurrentAreaName(area ? area.name : '');
        setIsDialogOpen(true);
    }, []);

    const handleSaveArea = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = currentAreaName.trim();
        if (!trimmedName) return toast({ title: "Nombre vacío", variant: "destructive" });

        const isDuplicate = areas.some(a => a.name.toLowerCase() === trimmedName.toLowerCase() && a.id !== editingArea?.id);
        if (isDuplicate) return toast({ title: "El área ya existe", variant: "destructive" });

        try {
            await personnelService.saveArea({ name: trimmedName }, editingArea?.id);
            toast({ title: `Área ${editingArea ? 'actualizada' : 'creada'}.` });
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving area:", error);
            toast({ title: "Error al guardar", variant: "destructive" });
        }
    };

    const handleDeleteArea = async (area: Area) => {
        try {
            await personnelService.deleteArea(area.id);
            toast({ title: "Área eliminada.", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting area:", error);
            toast({ title: "Error al eliminar", variant: "destructive" });
        }
    };
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Áreas de Trabajo</CardTitle>
                    <CardDescription>Gestiona las áreas o roles de tu taller.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Nueva Área</Button>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Nombre del Área</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {areas.length > 0 ? (
                                areas.map(area => (
                                    <TableRow key={area.id}>
                                        <TableCell className="font-medium">{area.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(area)}><Edit className="h-4 w-4"/></Button>
                                             <ConfirmDialog
                                                triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                                title={`¿Eliminar "${area.name}"?`}
                                                description="Esta acción no se puede deshacer. El personal asignado a esta área deberá ser reasignado."
                                                onConfirm={() => handleDeleteArea(area)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={2} className="h-24 text-center">No hay áreas definidas.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md p-0 flex flex-col">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle>{editingArea ? 'Editar' : 'Nueva'} Área de Trabajo</DialogTitle>
                         <DialogDescription>
                            Define un nombre claro para el área o rol.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto px-6 py-4">
                        <form id="area-form" onSubmit={handleSaveArea}>
                            <div className="space-y-2">
                                <Label htmlFor="area-name" className="text-left">Nombre del Área</Label>
                                <Input id="area-name" value={currentAreaName} onChange={(e) => setCurrentAreaName(capitalizeWords(e.target.value))} className="mt-2" />
                            </div>
                        </form>
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="area-form">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
