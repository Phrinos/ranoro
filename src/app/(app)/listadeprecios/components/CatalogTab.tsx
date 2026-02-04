"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Car, 
  Trash2, 
  LayoutGrid, 
  Settings,
  ArrowLeft,
  Wrench,
  PlusCircle,
  Pencil,
  AlertCircle
} from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleCatalogEditor } from '@/app/(app)/precios/components/VehicleCatalogEditor';
import { MASTER_CATALOG_COLLECTION } from '@/lib/vehicle-constants';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CatalogTabProps {
  priceLists: any[];
}

type ViewState = 'makes' | 'editor';

export default function CatalogTab({ priceLists }: CatalogTabProps) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewState>('makes');
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  
  // States for brand editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<{ name: string; modelsCount: number } | null>(null);
  const [newBrandName, setNewBrandName] = useState('');

  const sortedMakes = useMemo(() => {
    return [...priceLists].sort((a, b) => a.make.localeCompare(b.make));
  }, [priceLists]);

  const handleOpenEdit = (e: React.MouseEvent, makeName: string, modelsCount: number) => {
    e.stopPropagation();
    setEditingBrand({ name: makeName, modelsCount });
    setNewBrandName(makeName);
    setIsEditDialogOpen(true);
  };

  const handleSaveBrandName = async () => {
    if (!editingBrand || !newBrandName.trim() || newBrandName === editingBrand.name) return;
    try {
      await inventoryService.renameMasterMake(editingBrand.name, newBrandName);
      toast({ title: 'Marca actualizada' });
      setIsEditDialogOpen(false);
    } catch (e) {
      toast({ title: 'Error al renombrar', variant: 'destructive' });
    }
  };

  const handleDeleteMake = async () => {
    if (!editingBrand) return;
    try {
      await inventoryService.deleteMasterMake(editingBrand.name);
      toast({ title: 'Marca eliminada' });
      setIsEditDialogOpen(false);
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  if (view === 'editor' && selectedMake) {
    return (
      <div className="space-y-6 animate-in zoom-in-95 duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-primary/5">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setView('makes')} className="hover:bg-primary/5">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Marcas
            </Button>
            <div className="flex items-center gap-3">
              <Badge className="px-4 py-1 text-lg font-black uppercase tracking-tight">
                {selectedMake}
              </Badge>
              <Badge variant="outline" className="hidden sm:flex px-3 py-1 text-sm bg-muted font-bold text-muted-foreground">
                Editor Maestro
              </Badge>
            </div>
          </div>
        </div>
        <VehicleCatalogEditor 
          make={selectedMake} 
          collectionName={MASTER_CATALOG_COLLECTION}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedMakes.length > 0 ? (
        <Accordion type="multiple" className="space-y-3">
          {sortedMakes.map((m) => (
            <AccordionItem key={m.make} value={m.make} className="border border-primary/10 rounded-xl bg-card overflow-hidden">
              <div className="flex items-center justify-between pr-4 group">
                <AccordionTrigger className="flex-1 px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">{m.make}</span>
                  </div>
                </AccordionTrigger>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleOpenEdit(e, m.make, m.models?.length || 0)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <AccordionContent className="px-6 pb-6 pt-2 border-t border-primary/5 bg-muted/5">
                {m.models && m.models.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {m.models.sort((a:any, b:any) => a.name.localeCompare(b.name)).map((model: any) => (
                        <div 
                          key={model.name} 
                          className="flex items-center justify-between p-3 rounded-lg border bg-white hover:border-primary/30 cursor-pointer transition-all"
                          onClick={() => { setSelectedMake(m.make); setView('editor'); }}
                        >
                          <span className="font-semibold text-sm">{model.name}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button size="sm" onClick={() => { setSelectedMake(m.make); setView('editor'); }}>
                        <Wrench className="mr-2 h-4 w-4" /> Gestionar Catálogo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl bg-white space-y-4">
                    <p className="text-sm text-muted-foreground">Esta marca no tiene modelos registrados.</p>
                    <Button onClick={() => { setSelectedMake(m.make); setView('editor'); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Primer Modelo
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="py-24 text-center border-2 border-dashed rounded-3xl bg-muted/5 text-muted-foreground">
          <LayoutGrid className="mx-auto h-16 w-16 opacity-20 mb-4" />
          <h3 className="text-xl font-medium text-foreground/60">Catálogo Maestro Vacío</h3>
          <p className="max-w-md mx-auto mt-2 text-sm">
            Usa el botón superior para crear tu primera marca y empezar a construir tu base de datos técnica independiente.
          </p>
        </div>
      )}

      {/* Edit Brand Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Marca</DialogTitle>
            <DialogDescription>Cambia el nombre de la marca o elimínala si no tiene modelos.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la Marca</Label>
              <Input 
                value={newBrandName} 
                onChange={(e) => setNewBrandName(e.target.value.toUpperCase())}
              />
            </div>

            <div className="pt-4 border-t">
              <Label className="text-destructive font-bold block mb-2">Zona de Peligro</Label>
              {editingBrand?.modelsCount && editingBrand.modelsCount > 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No se puede eliminar la marca porque tiene {editingBrand.modelsCount} modelos registrados. Elimina los modelos primero.
                </div>
              ) : (
                <ConfirmDialog
                  triggerButton={
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Marca Permanentemente
                    </Button>
                  }
                  title={`¿Eliminar marca ${editingBrand?.name}?`}
                  description="Esta acción es irreversible y borrará la marca del catálogo maestro."
                  onConfirm={handleDeleteMake}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveBrandName} disabled={!newBrandName.trim() || newBrandName === editingBrand?.name}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
