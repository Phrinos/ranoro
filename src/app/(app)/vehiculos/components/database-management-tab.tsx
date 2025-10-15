// src/app/(app)/vehiculos/components/database-management-tab.tsx
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

// Definimos los tipos para la base de datos de vehículos
interface EngineGeneration {
  startYear: number;
  endYear: number;
  engines: string[];
}

interface VehicleModel {
  name: string;
  generations: EngineGeneration[];
}

interface VehicleMake {
  make: string;
  models: VehicleModel[];
}

export function DatabaseManagementTab() {
  const { toast } = useToast();
  const [db, setDb] = useState<VehicleMake[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [newModelName, setNewModelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const fetchVehicleData = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "vehicleData"));
        const vehicleData: VehicleMake[] = querySnapshot.docs.map(doc => ({ make: doc.id, ...doc.data() } as VehicleMake));
        setDb(vehicleData);
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos de vehículos.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    };

    fetchVehicleData();
  }, []);
  
  const makes = useMemo(() => db.map(d => d.make).sort(), [db]);
  const selectedMakeData = useMemo(() => db.find(d => d.make === selectedMake), [db, selectedMake]);

  const handleAddModel = () => {
    if (!newModelName.trim() || !selectedMakeData) return;
    
    const isDuplicate = selectedMakeData.models.some(m => m.name.toLowerCase() === newModelName.trim().toLowerCase());
    if (isDuplicate) {
        toast({ title: 'Error', description: 'El modelo ya existe para esta marca.', variant: 'destructive' });
        return;
    }

    const updatedDb = db.map(make => {
      if (make.make === selectedMake) {
        return {
          ...make,
          models: [...make.models, { name: newModelName.trim(), generations: [] }].sort((a, b) => a.name.localeCompare(b.name)),
        };
      }
      return make;
    });
    setDb(updatedDb);
    setNewModelName('');
  };
  
  const handleAddGeneration = (modelName: string) => {
    const updatedDb = db.map(make => {
        if (make.make === selectedMake) {
            return {
                ...make,
                models: make.models.map(model => {
                    if (model.name === modelName) {
                        const newGeneration: EngineGeneration = { startYear: new Date().getFullYear(), endYear: new Date().getFullYear(), engines: [] };
                        return { ...model, generations: [...model.generations, newGeneration] };
                    }
                    return model;
                }),
            };
        }
        return make;
    });
    setDb(updatedDb);
  };
  
  const handleUpdateGeneration = (modelName: string, genIndex: number, field: keyof EngineGeneration, value: any) => {
    const updatedDb = db.map(make => {
        if (make.make === selectedMake) {
            const models = make.models.map(model => {
                if (model.name === modelName) {
                    const generations = [...model.generations];
                    generations[genIndex] = { ...generations[genIndex], [field]: value };
                    return { ...model, generations };
                }
                return model;
            });
            return { ...make, models };
        }
        return make;
    });
    setDb(updatedDb);
  };

  const handleAddEngine = (modelName: string, genIndex: number, newEngine: string) => {
    if (!newEngine.trim()) return;
    const updatedDb = db.map(make => {
        if (make.make === selectedMake) {
            const models = make.models.map(model => {
                if (model.name === modelName) {
                    const generations = [...model.generations];
                    const engines = [...generations[genIndex].engines, newEngine.trim()];
                    generations[genIndex] = { ...generations[genIndex], engines };
                    return { ...model, generations };
                }
                return model;
            });
            return { ...make, models };
        }
        return make;
    });
    setDb(updatedDb);
  };

  const handleDeleteEngine = (modelName: string, genIndex: number, engineIndex: number) => {
     const updatedDb = db.map(make => {
        if (make.make === selectedMake) {
            const models = make.models.map(model => {
                if (model.name === modelName) {
                    const generations = [...model.generations];
                    const engines = generations[genIndex].engines.filter((_, i) => i !== engineIndex);
                    generations[genIndex] = { ...generations[genIndex], engines };
                    return { ...model, generations };
                }
                return model;
            });
            return { ...make, models };
        }
        return make;
    });
    setDb(updatedDb);
  };

  const handleSaveChanges = async () => {
    if (!selectedMakeData) {
      toast({ title: 'Error', description: 'No hay una marca seleccionada para guardar.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
        const batch = writeBatch(db);
        const makeRef = doc(db, "vehicleData", selectedMakeData.make);
        const { make, ...dataToSave } = selectedMakeData; // Exclude make from data
        batch.set(makeRef, dataToSave);
        await batch.commit();

        toast({
            title: 'Éxito',
            description: `Los datos de ${selectedMakeData.make} se han guardado correctamente.`,
        });
    } catch (error) {
        console.error("Error saving vehicle data:", error);
        toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
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
              <h3 className="font-semibold text-lg">Modelos de {selectedMake}</h3>
              <div className="flex items-center gap-2">
                <Input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Nombre del nuevo modelo" className="bg-white" />
                <Button onClick={handleAddModel}><PlusCircle className="mr-2 h-4 w-4" />Añadir Modelo</Button>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {selectedMakeData?.models.map(model => (
                  <AccordionItem value={model.name} key={model.name}>
                    <AccordionTrigger>{model.name}</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {model.generations.map((gen, genIndex) => (
                        <Card key={genIndex} className="p-4 bg-muted/50">
                          <div className="grid grid-cols-2 gap-4">
                            <Input type="number" value={gen.startYear} onChange={(e) => handleUpdateGeneration(model.name, genIndex, 'startYear', parseInt(e.target.value))} placeholder="Año Inicial" className="bg-white" />
                            <Input type="number" value={gen.endYear} onChange={(e) => handleUpdateGeneration(model.name, genIndex, 'endYear', parseInt(e.target.value))} placeholder="Año Final" className="bg-white" />
                          </div>
                          <div className="mt-2 space-y-2">
                            {gen.engines.map((engine, engineIndex) => (
                              <div key={engineIndex} className="flex items-center gap-2">
                                <Input value={engine} readOnly className="flex-1 bg-white" />
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteEngine(model.name, genIndex, engineIndex)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                              </div>
                            ))}
                            <AddEngineForm onAdd={(newEngine) => handleAddEngine(model.name, genIndex, newEngine)} />
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => handleAddGeneration(model.name)}><PlusCircle className="mr-2 h-4 w-4" />Añadir Generación (Años)</Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSaveChanges} disabled={isLoading || !selectedMake}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Cambios en la Base de Datos
        </Button>
      </div>
    </div>
  );
}

function AddEngineForm({ onAdd }: { onAdd: (engine: string) => void }) {
  const [engine, setEngine] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(engine);
    setEngine('');
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <Input value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="Ej: 1.6L I4 gasolina" className="bg-white" />
      <Button type="submit" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Añadir Motor</Button>
    </form>
  );
}
