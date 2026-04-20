"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VehicleGroup, GroupItemOption, InventoryItem } from '@/types';
import { PlusCircle, Trash2, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InventorySearchDialog } from '@/components/shared/InventorySearchDialog';
import { Badge } from '@/components/ui/badge';

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: VehicleGroup | null;
  onSave: (data: Partial<VehicleGroup>) => Promise<void>;
  priceLists: any[];
}

const CATEGORY_NAMES = {
  aceites: 'Aceites',
  filtrosAceite: 'Filtros de Aceite',
  filtrosAire: 'Filtros de Aire',
  bujias: 'Bujías',
  otros: 'Otras Refacciones'
};

const DEFAULT_ITEMS: VehicleGroup['items'] = {
  aceites: [],
  filtrosAceite: [],
  filtrosAire: [],
  bujias: [],
  otros: []
};

export function GroupDialog({ open, onOpenChange, group, onSave, priceLists }: GroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<VehicleGroup['members']>([]);
  const [items, setItems] = useState<VehicleGroup['items']>(DEFAULT_ITEMS);
  
  const [catToAdd, setCatToAdd] = useState<keyof VehicleGroup['items'] | null>(null);

  useEffect(() => {
    if (open) {
      setName(group?.name || '');
      setDescription(group?.description || '');
      setMembers(group?.members || []);
      setItems(group?.items || DEFAULT_ITEMS);
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

  const handleItemSelect = (invItem: InventoryItem, quantity: number) => {
    if (!catToAdd) return;
    const newItem: GroupItemOption = {
      inventoryItemId: invItem.id,
      name: invItem.name,
      quantity
    };
    setItems((prev) => ({
      ...prev,
      [catToAdd]: [...prev[catToAdd], newItem]
    }));
    setCatToAdd(null);
  };

  const handleRemoveItem = (cat: keyof VehicleGroup['items'], idx: number) => {
    setItems(prev => {
      const arr = [...prev[cat]];
      arr.splice(idx, 1);
      return { ...prev, [cat]: arr };
    });
  };

  const handleSubmit = async () => {
    await onSave({
      name,
      description,
      members: members.filter(m => m.make && m.model),
      items
    });
  };

  const allMakes = priceLists.map(pl => pl.make).sort();
  const getModelsForMake = (make: string) => {
    const list = priceLists.find(pl => pl.make === make);
    return list ? list.models.map((m: any) => m.name).sort() : [];
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b bg-white">
          <DialogTitle>{group ? 'Editar Regla de Precios' : 'Nueva Regla de Precios'}</DialogTitle>
          <DialogDescription>Define qué modelos comparten las mismas refacciones y fluidos.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="grow p-6 space-y-6">
          <div className="space-y-6 pb-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre de la Regla</Label>
                <Input placeholder="Ej: Nissan Motor HR16DE" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descripción Breve</Label>
                <Input placeholder="Aplica para Versa, March, Kicks..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-bold">Modelos Compatibles</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMember}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modelo
                </Button>
              </div>
              <div className="space-y-3">
                {members.map((m, i) => (
                  <div key={i} className="flex gap-2 items-end p-3 rounded-md border bg-muted/30">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase">Marca</Label>
                      <Select value={m.make} onValueChange={v => { updateMember(i, 'make', v); updateMember(i, 'model', ''); }}>
                        <SelectTrigger className="bg-white h-8"><SelectValue placeholder="Marca..." /></SelectTrigger>
                        <SelectContent>{allMakes.map(mk => <SelectItem key={mk} value={mk}>{mk}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase">Modelo</Label>
                      <Select value={m.model} onValueChange={v => updateMember(i, 'model', v)} disabled={!m.make}>
                        <SelectTrigger className="bg-white h-8"><SelectValue placeholder="Modelo..." /></SelectTrigger>
                        <SelectContent>{getModelsForMake(m.make).map((mod: string) => <SelectItem key={mod} value={mod}>{mod}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMember(i)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
                {members.length === 0 && <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg text-center border-2 border-dashed">Sin modelos vinculados. Agrega uno.</p>}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-bold mb-4 block">Refacciones y Componentes Compatibles</Label>
              <div className="space-y-4">
                {(Object.keys(CATEGORY_NAMES) as Array<keyof typeof CATEGORY_NAMES>).map(catKey => (
                  <div key={catKey} className="border rounded-lg p-4 bg-muted/5">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {CATEGORY_NAMES[catKey]}
                      </h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setCatToAdd(catKey)} className="h-8 text-xs">
                        <PlusCircle className="mr-1 h-3 w-3" /> Añadir
                      </Button>
                    </div>
                    
                    {items[catKey].length > 0 ? (
                      <div className="space-y-2">
                        {items[catKey].map((itm, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded-md text-sm">
                            <div>
                               <span className="font-medium">{itm.name}</span>
                               <Badge variant="secondary" className="ml-2 text-[10px]">Ctd: {itm.quantity}</Badge>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveItem(catKey, idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No hay opciones registradas.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-white pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || members.length === 0}>Guardar Regla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {catToAdd && (
      <InventorySearchDialog
        open={true}
        onOpenChange={(v) => !v && setCatToAdd(null)}
        onItemSelected={handleItemSelect}
      />
    )}
    </>
  );
}
