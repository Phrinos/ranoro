// src/app/(app)/vehiculos/components/database-management-tab.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { VehicleCatalogEditor } from '@/app/(app)/precios/components/VehicleCatalogEditor';
import { VEHICLE_COLLECTION } from '@/lib/vehicle-constants';

export function DatabaseManagementTab() {
  const { toast } = useToast();
  const [vehicleDb, setVehicleDb] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="space-y-6">
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
        <div className="pt-4 mt-4 border-t">
          <VehicleCatalogEditor make={selectedMake} />
        </div>
      )}
    </div>
  );
}
