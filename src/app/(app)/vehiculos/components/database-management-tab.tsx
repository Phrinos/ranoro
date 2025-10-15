// src/app/(app)/vehiculos/components/database-management-tab.tsx
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Trash2, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, doc, writeBatch, deleteField } from 'firebase/firestore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { VehicleDialog } from './vehicle-dialog';
import type { VehicleFormValues } from './vehicle-form';
import type { Vehicle } from '@/types';

// Definimos los tipos para la base de datos de vehículos
interface EngineGeneration {
  startYear: number;
  endYear: number;
  engines: { name: string;[key: string]: any }[];
}

interface VehicleModel {
  name: string;
  generations: EngineGeneration[];
}

interface VehicleMake {
  make: string;
  models: VehicleModel[];
}

export function DatabaseManagementTab({ onVehicleSave }: { onVehicleSave: (data: VehicleFormValues, id?: string) => Promise<void> }) {
  const { toast } = useToast();
  const [vehicleData, setVehicleData] = useState<VehicleMake[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [newModelName, setNewModelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  useEffect(() => {
    const fetchVehicleData = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "vehicleData"));
        const data: VehicleMake[] = querySnapshot.docs.map(doc => ({ make: doc.id, ...doc.data() } as VehicleMake));
        setVehicleData(data);
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos de vehículos.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    };

    fetchVehicleData();
  }, [toast]);
  
  const makes = useMemo(() => vehicleData.map(d => d.make).sort(), [vehicleData]);
  const selectedMakeData = useMemo(() => vehicleData.find(d => d.make === selectedMake), [vehicleData, selectedMake]);

  const handleOpenVehicleDialog = (vehicle: Partial<Vehicle> | null = null) => {
    setEditingVehicle(vehicle ? { ...vehicle, make: selectedMake } : { make: selectedMake });
    setIsVehicleDialogOpen(true);
  };
  
  const handleDeleteModel = async (modelName: string) => {
    if (!selectedMakeData) return;
    setIsLoading(true);
    try {
        const updatedModels = selectedMakeData.models.filter(m => m.name !== modelName);
        const makeRef = doc(db, "vehicleData", selectedMakeData.make);
        
        await writeBatch(db).update(makeRef, { models: updatedModels }).commit();

        setVehicleData(prevData => prevData.map(make => 
            make.make === selectedMake ? { ...make, models: updatedModels } : make
        ));

        toast({ title: 'Modelo Eliminado', description: `El modelo "${modelName}" fue eliminado.` });
    } catch (error) {
        console.error("Error deleting model:", error);
        toast({ title: 'Error', description: 'No se pudo eliminar el modelo.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };


  const handleSaveChanges = async () => {
    // This function might be deprecated if we save on model edit.
    // Kept for now in case of batch updates in the future.
    toast({ title: 'Funcionalidad en desarrollo', description: 'Guardado se realiza al editar cada modelo.' });
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestionar Base de Datos de Vehículos</CardTitle>
            <CardDescription>Añade o edita modelos, años y motores para las marcas existentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marca</label>
              {isDataLoaded ? (
                <Select value={selectedMake} onValueChange={setSelectedMake}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione una marca para editar..." /></SelectTrigger>
                  <SelectContent>{makes.map(make => <SelectItem key={make} value={make}>{make}</SelectItem>)}</SelectContent>
                </Select>
              ) : <p>Cargando marcas...</p>}
            </div>

            {selectedMake && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Modelos de {selectedMake}</h3>
                    <Button onClick={() => handleOpenVehicleDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />Añadir Modelo
                    </Button>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  {selectedMakeData?.models.map(model => (
                    <AccordionItem value={model.name} key={model.name} className="group">
                      <div className="flex items-center justify-between w-full pr-4 hover:bg-muted/50 rounded-md">
                        <AccordionTrigger className="hover:no-underline flex-1 py-3 px-4">
                          <span>{model.name}</span>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenVehicleDialog(model as any); }}>
                                <Edit className="h-4 w-4" />
                           </Button>
                           <ConfirmDialog
                                triggerButton={
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                }
                                title={`¿Eliminar modelo "${model.name}"?`}
                                description="Esta acción es permanente y eliminará todas sus generaciones y motores asociados."
                                onConfirm={() => handleDeleteModel(model.name)}
                            />
                        </div>
                      </div>
                      <AccordionContent className="space-y-2">
                         {model.generations.map((gen, genIndex) => (
                           <div key={genIndex} className="pl-4 border-l-2 ml-2">
                              <p className="font-semibold text-sm">{gen.startYear} - {gen.endYear}</p>
                              <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                                  {gen.engines.map((engine, engineIndex) => (
                                      <li key={engineIndex}>{engine.name}</li>
                                  ))}
                              </ul>
                           </div>
                         ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        vehicle={editingVehicle}
        onSave={(data) => {
            // Placeholder save logic, actual logic is within onVehicleSave prop
            onVehicleSave(data, editingVehicle?.id);
            setIsVehicleDialogOpen(false);
        }}
      />
    </>
  );
}
