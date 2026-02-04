
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  ChevronLeft, 
  Car, 
  Trash2, 
  LayoutGrid, 
  PlusCircle, 
  Settings,
  ArrowLeft,
  Wrench
} from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleCatalogEditor } from '@/app/(app)/precios/components/VehicleCatalogEditor';
import { MASTER_CATALOG_COLLECTION } from '@/lib/vehicle-constants';

interface CatalogTabProps {
  priceLists: any[];
}

type ViewState = 'makes' | 'models' | 'editor';

export default function CatalogTab({ priceLists }: CatalogTabProps) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewState>('makes');
  const [selectedMake, setSelectedMake] = useState<string | null>(null);

  // 1. Marcas ordenadas
  const sortedMakes = useMemo(() => {
    return [...priceLists].sort((a, b) => a.make.localeCompare(b.make));
  }, [priceLists]);

  // 2. Modelos de la marca seleccionada
  const currentMakeData = useMemo(() => {
    if (!selectedMake) return null;
    return priceLists.find(pl => pl.make === selectedMake);
  }, [priceLists, selectedMake]);

  const sortedModels = useMemo(() => {
    if (!currentMakeData?.models) return [];
    return [...currentMakeData.models].sort((a, b) => a.name.localeCompare(b.name));
  }, [currentMakeData]);

  const handleDeleteMake = async (makeName: string) => {
    try {
      await inventoryService.deleteMasterMake(makeName);
      toast({ title: 'Marca eliminada', description: `Se ha borrado ${makeName} del catálogo maestro.` });
      if (selectedMake === makeName) {
        setSelectedMake(null);
        setView('makes');
      }
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo eliminar la marca.', variant: 'destructive' });
    }
  };

  // --- RENDERIZADO DE VISTAS ---

  // A. Lista de Marcas (Grid)
  if (view === 'makes') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedMakes.length > 0 ? (
          sortedMakes.map((m) => (
            <Card key={m.make} className="group hover:shadow-md transition-all cursor-pointer border-primary/10" onClick={() => { setSelectedMake(m.make); setView('models'); }}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <ConfirmDialog
                    triggerButton={
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title={`¿Eliminar marca ${m.make}?`}
                    description="Esta acción borrará todos los modelos y configuraciones de esta marca permanentemente."
                    onConfirm={() => handleDeleteMake(m.make)}
                  />
                </div>
                <CardTitle className="mt-4 text-xl">{m.make}</CardTitle>
                <CardDescription>
                  {m.models?.length || 0} modelos registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto text-primary font-bold hover:bg-transparent">
                  Ver Modelos
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/5 text-muted-foreground">
            <LayoutGrid className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-foreground/60">Catálogo Maestro Vacío</h3>
            <p className="max-w-xs mx-auto mt-2 text-sm">
              Usa el botón superior para crear tu primera marca y empezar a construir tu base de datos técnica.
            </p>
          </div>
        )}
      </div>
    );
  }

  // B. Lista de Modelos de una Marca
  if (view === 'models') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setView('makes')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Marcas
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5">{selectedMake}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="col-span-full md:col-span-1">
            <CardHeader>
              <CardTitle>Modelos de {selectedMake}</CardTitle>
              <CardDescription>Selecciona un modelo para ver sus costos e insumos detallados.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {sortedModels.length > 0 ? (
                    sortedModels.map((model) => (
                      <div 
                        key={model.name} 
                        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setView('editor')}
                      >
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{model.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground italic">
                      No hay modelos registrados. Usa el editor para añadir el primero.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="col-span-full md:col-span-1 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Gestión de Marca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Desde aquí puedes entrar al modo de edición profunda para añadir modelos, rangos de años y motores específicos para <strong>{selectedMake}</strong>.</p>
              <Button onClick={() => setView('editor')} className="w-full">
                <Wrench className="mr-2 h-4 w-4" /> Abrir Editor de Modelos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // C. Editor de Modelos (Generaciones, Motores, Costos)
  if (view === 'editor') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setView('models')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Modelos
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5">{selectedMake}</Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm bg-muted">Editor Maestro</Badge>
            </div>
          </div>
        </div>

        <VehicleCatalogEditor 
          make={selectedMake!} 
          collectionName={MASTER_CATALOG_COLLECTION}
        />
      </div>
    );
  }

  return null;
}
