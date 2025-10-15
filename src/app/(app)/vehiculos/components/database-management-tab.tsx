// src/app/(app)/vehiculos/components/database-management-tab.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { VEHICLE_COLLECTION } from '@/lib/vehicle-constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { VehicleDialog } from './vehicle-dialog';
import type { Vehicle } from '@/types';
import type { VehicleFormValues } from './vehicle-form';


export function DatabaseManagementTab({ onVehicleSave }: { onVehicleSave: (data: VehicleFormValues, id?:string) => void }) {
  const { toast } = useToast();
  const [vehicleDb, setVehicleDb] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  useEffect(() => {
    const fetchMakes = async () => {
      setIsLoading(true);
      try {
        if (!db) {
            console.warn("Firestore client not available");
            return;
        };
        const querySnapshot = await getDocs(collection(db, VEHICLE_COLLECTION));
        const data = querySnapshot.docs
            .map((doc) => ({ make: doc.id, ...doc.data() }))
            .sort((a,b) => a.make.localeCompare(b.make));
        setVehicleDb(data);
      } catch (error) {
        console.error("Error fetching vehicle makes:", error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las marcas de vehículos.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMakes();
  }, [toast]);
  
  const makes = useMemo(() => vehicleDb.map(d => d.make).sort(), [vehicleDb]);
  const selectedMakeData = useMemo(() => vehicleDb.find(d => d.make === selectedMake), [vehicleDb, selectedMake]);

  const handleOpenVehicleDialog = (vehicle: Partial<Vehicle> | null = null) => {
    setEditingVehicle(vehicle ? { ...vehicle, make: selectedMake } : { make: selectedMake });
    setIsVehicleDialogOpen(true);
  };
  
  const handleSaveVehicle = async (data: VehicleFormValues) => {
    await onVehicleSave(data, editingVehicle?.id);
    setIsVehicleDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestionar Base de Datos de Vehículos</CardTitle>
          <CardDescription>
            Selecciona una marca para añadir o editar sus modelos, generaciones y motores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-2">
            <label htmlFor="make-select" className="text-sm font-medium">Marca</label>
            <Select
              value={selectedMake}
              onValueChange={setSelectedMake}
              disabled={isLoading}
            >
              <SelectTrigger id="make-select" className="bg-white">
                <SelectValue placeholder={isLoading ? "Cargando marcas..." : "Seleccione una marca..."} />
              </SelectTrigger>
              <SelectContent>
                {makes.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMake && (
            <div className="pt-4 border-t">
              <Accordion type="multiple" className="w-full space-y-2">
                {selectedMakeData?.models.map((model: any) => (
                  <AccordionItem key={model.name} value={model.name} className="border rounded-md px-4 bg-card">
                    <div className="flex items-center justify-between w-full">
                      <AccordionTrigger className="hover:no-underline font-semibold flex-1">
                        {model.name}
                      </AccordionTrigger>
                      <div className="flex items-center gap-1 pl-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenVehicleDialog(model)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <AccordionContent className="pt-2">
                      <div className="pl-4 border-l ml-2 space-y-1">
                        {model.generations.map((gen: any, genIndex: number) => (
                          <div key={genIndex}>
                            <p className="font-semibold text-xs text-muted-foreground my-2">{gen.startYear} - {gen.endYear}</p>
                            <div className="pl-4 border-l ml-2 space-y-1">
                              {gen.engines.map((engine: any, engineIndex: number) => (
                                <div key={engineIndex} className="text-sm">
                                  - {engine.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="mt-4">
                <Button onClick={() => handleOpenVehicleDialog()}>Añadir Modelo a {selectedMake}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        onSave={handleSaveVehicle}
        vehicle={editingVehicle}
      />
    </div>
  );
}
