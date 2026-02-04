
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { VehicleGroup } from '@/types';
import { PlusCircle, Trash2, Car, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditEngineDataDialog } from '@/app/(app)/precios/components/EditEngineDataDialog';

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: VehicleGroup | null;
  onSave: (data: Partial<VehicleGroup>) => Promise<void>;
  priceLists: any[];
}

export function GroupDialog({ open, onOpenChange, group, onSave, priceLists }: GroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<VehicleGroup['members']>([]);
  const [sharedEngineData, setSharedEngineData] = useState<any>(null);
  const [isEngineEditorOpen, setIsEngineEditDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(group?.name || '');
      setDescription(group?.description || '');
      setMembers(group?.members || []);
      setSharedEngineData(group?.sharedEngineData || null);
    }
  }, [open, group]);

  const handleAddMember = () => {
    setMembers([...members, { make: '', model: '' }]);
  };

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: string, value: string) => {
    const updated = [...members];
    (updated[idx] as any)[field] = value;
    setMembers(updated);
  };

  const handleSubmit = async () => {
    await onSave({
      name,
      description,
      members: members.filter(m => m.make && m.model),
      sharedEngineData
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b bg-white">
          <DialogTitle>{group ? 'Editar Grupo' : 'Nuevo Grupo de Compatibilidad'}</DialogTitle>
          <DialogDescription>Los modelos añadidos compartirán la misma configuración de motor y precios.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del Grupo</Label>
                <Input placeholder="Ej: Versa/March Platform" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input placeholder="Notas breves..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-bold">Modelos Hermanados</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMember}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modelo
                </Button>
              </div>
              <div className="space-y-3">
                {members.map((m, i) => (
                  <div key={i} className="flex gap-2 items-end p-3 rounded-md border bg-muted/30">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase">Marca</Label>
                      <Select value={m.make} onValueChange={v => updateMember(i, 'make', v)}>
                        <SelectTrigger className="bg-white h-8"><SelectValue placeholder="Marca..." /></SelectTrigger>
                        <SelectContent>{priceLists.map(pl => <SelectItem key={pl.make} value={pl.make}>{pl.make}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase">Modelo</Label>
                      <Input className="h-8 bg-white" placeholder="Ej: VERSA" value={m.model} onChange={e => updateMember(i, 'model', e.target.value.toUpperCase())} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMember(i)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-bold mb-2 block">Configuración de Motor Compartida</Label>
              <div className="p-4 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center bg-muted/10">
                {sharedEngineData ? (
                  <div className="w-full flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-semibold">{sharedEngineData.name || "Motor Compartido"}</p>
                      <p className="text-xs text-muted-foreground">Precios y refacciones configurados.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEngineEditDialogOpen(true)}>
                      <Settings className="mr-2 h-4 w-4" /> Editar Datos
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">Aún no has configurado los datos técnicos que compartirán estos modelos.</p>
                    <Button type="button" variant="secondary" onClick={() => setIsEngineEditDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Configurar Datos del Motor
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || members.length === 0}>Guardar Grupo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <EditEngineDataDialog 
      open={isEngineEditorOpen}
      onOpenChange={setIsEngineEditDialogOpen}
      engineData={sharedEngineData || { name: 'Motor Compartido', insumos: {}, servicios: {} }}
      onSave={(updated) => {
        setSharedEngineData(updated);
        setIsEngineEditDialogOpen(false);
      }}
    />
    </>
  );
}
