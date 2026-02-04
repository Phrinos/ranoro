"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Layers, ChevronRight, Info } from 'lucide-react';
import type { VehicleGroup } from '@/types';
import { GroupDialog } from './GroupDialog';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface GroupsTabProps {
  groups: VehicleGroup[];
  priceLists: any[];
}

export default function GroupsTab({ groups, priceLists }: GroupsTabProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VehicleGroup | null>(null);

  const handleOpenDialog = (group?: VehicleGroup) => {
    setEditingGroup(group || null);
    setIsDialogOpen(true);
  };

  const handleSaveGroup = async (data: Partial<VehicleGroup>) => {
    try {
      await inventoryService.saveVehicleGroup(data, editingGroup?.id);
      toast({ title: `Grupo ${editingGroup ? 'actualizado' : 'creado'}` });
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo guardar el grupo.", variant: "destructive" });
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await inventoryService.deleteVehicleGroup(id);
      toast({ title: "Grupo eliminado", variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el grupo.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Grupos de Compatibilidad</h3>
          <p className="text-sm text-muted-foreground">Agrupa modelos que comparten las mismas refacciones (ej. Versa/March).</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Grupo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.length > 0 ? groups.map(group => (
          <Card key={group.id} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(group)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <ConfirmDialog
                    triggerButton={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                    title="¿Eliminar Grupo?"
                    description="Los vehículos vinculados ya no compartirán estos datos técnicos."
                    onConfirm={() => handleDeleteGroup(group.id)}
                  />
                </div>
              </div>
              <CardTitle className="mt-3">{group.name}</CardTitle>
              <CardDescription className="line-clamp-2 min-h-[40px]">{group.description || "Sin descripción."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modelos Vinculados</p>
                <div className="flex flex-wrap gap-1">
                  {group.members?.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {m.make} {m.model}
                    </Badge>
                  ))}
                  {(!group.members || group.members.length === 0) && <p className="text-xs italic text-muted-foreground">Sin modelos asignados.</p>}
                </div>
              </div>
              <Separator />
              <Button variant="ghost" className="w-full justify-between text-xs h-8 p-0 hover:bg-transparent" onClick={() => handleOpenDialog(group)}>
                <span>Configurar Datos Técnicos</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium">No hay grupos creados</h4>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              Los grupos te ayudan a gestionar precios de varios modelos al mismo tiempo cuando usan las mismas piezas.
            </p>
            <Button variant="outline" className="mt-6 bg-white" onClick={() => handleOpenDialog()}>
              Crear el primer grupo
            </Button>
          </div>
        )}
      </div>

      <GroupDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        group={editingGroup} 
        onSave={handleSaveGroup}
        priceLists={priceLists}
      />
    </div>
  );
}
