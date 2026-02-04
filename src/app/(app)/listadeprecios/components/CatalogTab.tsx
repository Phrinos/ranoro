"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Database
} from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleCatalogEditor } from '@/app/(app)/precios/components/VehicleCatalogEditor';
import { MASTER_CATALOG_COLLECTION } from '@/lib/vehicle-constants';
import { cn } from '@/lib/utils';

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

  // A. Lista de Marcas (Tarjetas Horizontales Wide)
  if (view === 'makes') {
    return (
      <div className="space-y-4">
        {sortedMakes.length > 0 ? (
          sortedMakes.map((m) => (
            <Card key={m.make} className="group hover:shadow-md transition-all border-primary/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-center">
                  {/* Branding Area */}
                  <div className="p-6 flex items-center gap-4 flex-1 w-full border-b sm:border-b-0 sm:border-r border-primary/5">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Car className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold tracking-tight">{m.make}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {m.models?.length || 0} Modelos
                        </Badge>
                        <span className="text-xs text-muted-foreground italic">Catálogo Independiente</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="p-6 flex flex-wrap items-center gap-3 w-full sm:w-auto bg-muted/5">
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-none bg-white font-semibold"
                      onClick={() => { setSelectedMake(m.make); setView('models'); }}
                    >
                      <Database className="mr-2 h-4 w-4 text-blue-600" />
                      Ver Modelos
                    </Button>
                    
                    <Button 
                      className="flex-1 sm:flex-none font-bold"
                      onClick={() => { setSelectedMake(m.make); setView('editor'); }}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Gestionar Catálogo
                    </Button>

                    <ConfirmDialog
                      triggerButton={
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      }
                      title={`¿Eliminar marca ${m.make}?`}
                      description="Esta acción borrará todos los modelos y configuraciones de esta marca permanentemente del catálogo maestro."
                      onConfirm={() => handleDeleteMake(m.make)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-24 text-center border-2 border-dashed rounded-3xl bg-muted/5 text-muted-foreground">
            <LayoutGrid className="mx-auto h-16 w-16 opacity-20 mb-4" />
            <h3 className="text-xl font-medium text-foreground/60">Catálogo Maestro Vacío</h3>
            <p className="max-w-md mx-auto mt-2 text-sm">
              Usa el botón superior para crear tu primera marca y empezar a construir tu base de datos técnica independiente.
            </p>
          </div>
        )}
      </div>
    );
  }

  // B. Lista de Modelos de una Marca
  if (view === 'models') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setView('makes')} className="hover:bg-primary/5">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Marcas
          </Button>
          <Badge variant="outline" className="px-4 py-1.5 text-base font-bold bg-primary/5 border-primary/20 text-primary uppercase">
            {selectedMake}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-lg rounded-2xl border-primary/5">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Modelos Registrados</CardTitle>
                  <CardDescription>Selecciona un modelo para ver sus costos e insumos detallados.</CardDescription>
                </div>
                <Button onClick={() => setView('editor')} size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Modelo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-primary/5">
                  {sortedModels.length > 0 ? (
                    sortedModels.map((model) => (
                      <div 
                        key={model.name} 
                        className="flex items-center justify-between p-5 hover:bg-primary/5 cursor-pointer transition-all group"
                        onClick={() => setView('editor')}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                            <Car className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div>
                            <span className="font-bold text-lg block">{model.name}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-widest">
                              {model.generations?.length || 0} Generaciones configuradas
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-muted-foreground italic flex flex-col items-center">
                      <Car className="h-12 w-12 opacity-10 mb-4" />
                      <p className="text-lg">No hay modelos registrados aún.</p>
                      <Button variant="link" onClick={() => setView('editor')} className="mt-2">
                        Haz clic aquí para añadir el primero.
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Editor Maestro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">
                  Entra al modo de edición profunda para gestionar todos los modelos, rangos de años y motores específicos de la marca <strong>{selectedMake}</strong>.
                </p>
                <Button onClick={() => setView('editor')} className="w-full h-12 text-base font-bold shadow-md hover:shadow-xl transition-all">
                  <Wrench className="mr-2 h-5 w-5" /> Abrir Editor Avanzado
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 rounded-2xl">
              <CardContent className="p-6 text-center space-y-2">
                <Database className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Tip de Administración</p>
                <p className="text-sm text-muted-foreground italic">
                  "Agrupa modelos similares en la pestaña 'Grupos' para actualizar precios de varios coches al mismo tiempo."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // C. Editor de Modelos (Generaciones, Motores, Costos) - La "Página Nueva"
  if (view === 'editor') {
    return (
      <div className="space-y-6 animate-in zoom-in-95 duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-primary/5">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setView('models')} className="hover:bg-primary/5">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Modelos
            </Button>
            <div className="flex items-center gap-3">
              <Badge className="px-4 py-1 text-lg font-black uppercase tracking-tight">
                {selectedMake}
              </Badge>
              <Badge variant="outline" className="hidden sm:flex px-3 py-1 text-sm bg-muted font-bold text-muted-foreground">
                Editor Maestro Independiente
              </Badge>
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
