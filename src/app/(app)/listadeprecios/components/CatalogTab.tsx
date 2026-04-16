"use client";

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  LayoutGrid,
  PlusCircle,
  Pencil,
  AlertCircle
} from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { MASTER_CATALOG_COLLECTION } from '@/lib/vehicle-constants';

interface CatalogTabProps {
  priceLists: any[];
}

export default function CatalogTab({ priceLists }: CatalogTabProps) {
  const { toast } = useToast();
  
  // States for brand editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<{ name: string; modelsCount: number } | null>(null);
  const [newBrandName, setNewBrandName] = useState('');

  // States for adding model
  const [makeToAddModel, setMakeToAddModel] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState('');

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

  const handleAddModel = async (make: string) => {
      if (!newModelName.trim() || !db) return;
      try {
          const docRef = doc(db, MASTER_CATALOG_COLLECTION, make);
          const snap = await getDoc(docRef);
          if (!snap.exists()) return;
          
          const data = snap.data();
          const models = data.models || [];
          
          const modelNameUpper = newModelName.toUpperCase().trim();
          if (models.some((m: any) => m.name === modelNameUpper)) {
              toast({ title: 'Error', description: 'El modelo ya existe', variant: 'destructive' });
              return;
          }
          
          models.push({ name: modelNameUpper, generations: [] });
          await setDoc(docRef, { models }, { merge: true });
          
          toast({ title: 'Modelo añadido' });
          setNewModelName('');
          setMakeToAddModel(null);
      } catch (e) {
          toast({ title: 'Error', description: 'No se pudo añadir el modelo', variant: 'destructive' });
      }
  };

  const handleDeleteModel = async (make: string, modelName: string) => {
      if (!db) return;
      try {
          const docRef = doc(db, MASTER_CATALOG_COLLECTION, make);
          const snap = await getDoc(docRef);
          if (!snap.exists()) return;
          
          const data = snap.data();
          const models = (data.models || []).filter((m: any) => m.name !== modelName);
          
          await setDoc(docRef, { models }, { merge: true });
          toast({ title: 'Modelo eliminado' });
      } catch (e) {
          toast({ title: 'Error', description: 'No se pudo eliminar el modelo', variant: 'destructive' });
      }
  };

  return (
    <div className="space-y-4">
      {sortedMakes.length > 0 ? (
        <Accordion type="multiple" className="space-y-3">
          {sortedMakes.map((m) => (
            <AccordionItem key={m.make} value={m.make} className="border border-primary/10 rounded-xl bg-card overflow-hidden">
              <div className="group">
                <AccordionTrigger className="flex px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold tracking-tight">{m.make}</span>
                    <div 
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={(e) => handleOpenEdit(e, m.make, m.models?.length || 0)}
                    >
                      <Pencil className="h-4 w-4" />
                    </div>
                  </div>
                </AccordionTrigger>
              </div>

              <AccordionContent className="px-6 pb-6 pt-2 border-t border-primary/5 bg-muted/5">
                  <div className="space-y-4">
                    {m.models && m.models.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {m.models.sort((a:any, b:any) => a.name.localeCompare(b.name)).map((model: any) => (
                            <div 
                            key={model.name} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-white group cursor-default"
                            >
                            <span className="font-semibold text-sm">{model.name}</span>
                            <ConfirmDialog
                                triggerButton={
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                }
                                title={`¿Eliminar ${model.name}?`}
                                description="Esta acción borrará el modelo del catálogo."
                                onConfirm={() => handleDeleteModel(m.make, model.name)}
                            />
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="py-4 text-center border-2 border-dashed rounded-xl bg-white space-y-2">
                        <p className="text-sm text-muted-foreground">Esta marca no tiene modelos registrados.</p>
                        </div>
                    )}
                    
                    {makeToAddModel === m.make ? (
                        <div className="flex items-center gap-2 max-w-sm mt-4">
                            <Input 
                                placeholder="Nombre del modelo..." 
                                value={newModelName} 
                                onChange={e => setNewModelName(e.target.value)}
                                autoFocus
                            />
                            <Button size="sm" onClick={() => handleAddModel(m.make)}>Añadir</Button>
                            <Button size="sm" variant="ghost" onClick={() => setMakeToAddModel(null)}>Cancelar</Button>
                        </div>
                    ) : (
                        <div className="flex justify-start pt-2">
                            <Button size="sm" variant="outline" onClick={() => { setMakeToAddModel(m.make); setNewModelName(''); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modelo
                            </Button>
                        </div>
                    )}
                  </div>
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
