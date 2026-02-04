// src/app/(app)/listadeprecios/components/CatalogTab.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, LayoutGrid } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { VehicleCatalogEditor } from '@/app/(app)/precios/components/VehicleCatalogEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { MASTER_CATALOG_COLLECTION } from '@/lib/vehicle-constants';

interface CatalogTabProps {
  priceLists: any[];
}

export default function CatalogTab({ priceLists }: CatalogTabProps) {
  const [selectedMake, setSelectedMake] = useState<string>('');
  const { toast } = useToast();

  const sortedMakes = useMemo(() => {
    return priceLists.map(pl => pl.make).sort();
  }, [priceLists]);

  const handleDeleteMake = async () => {
    if (!selectedMake) return;
    try {
      await inventoryService.deleteMasterMake(selectedMake);
      toast({ title: 'Marca eliminada', description: `Se ha borrado ${selectedMake} del catálogo maestro.` });
      setSelectedMake('');
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo eliminar la marca.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Editor del Catálogo Maestro</CardTitle>
              <CardDescription>Gestiona modelos y motores en esta base de datos independiente.</CardDescription>
            </div>
            {selectedMake && (
              <ConfirmDialog
                triggerButton={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Marca
                  </Button>
                }
                title={`¿Eliminar marca ${selectedMake}?`}
                description="Esta acción borrará todos los modelos y configuraciones de esta marca de forma permanente en el catálogo maestro."
                onConfirm={handleDeleteMake}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Marca para Editar</label>
              <Select value={selectedMake} onValueChange={setSelectedMake}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Busca o selecciona una marca..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedMakes.length > 0 ? (
                    sortedMakes.map(make => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Catálogo maestro vacío. Crea una marca primero.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {selectedMake ? (
          <VehicleCatalogEditor 
            make={selectedMake} 
            collectionName={MASTER_CATALOG_COLLECTION}
          />
        ) : (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/5 text-muted-foreground">
            <LayoutGrid className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-foreground/60">Catálogo Maestro Vacío</h3>
            <p className="max-w-xs mx-auto mt-2 text-sm">
              Selecciona una marca arriba o crea una nueva para empezar a construir tu base de datos técnica independiente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
