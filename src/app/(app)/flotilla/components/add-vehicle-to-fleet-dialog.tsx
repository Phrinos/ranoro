
"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Car, DollarSign } from "lucide-react";
import type { Vehicle } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface AddVehicleToFleetDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vehicles: Vehicle[];
  onAddVehicle: (vehicleId: string, dailyRentalCost: number) => void;
}

export function AddVehicleToFleetDialog({
  open,
  onOpenChange,
  vehicles,
  onAddVehicle,
}: AddVehicleToFleetDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dailyRentalCost, setDailyRentalCost] = useState<number | ''>('');

  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) return vehicles.slice(0, 10);
    const lowercasedFilter = searchTerm.toLowerCase();
    return vehicles.filter(v =>
      v.licensePlate.toLowerCase().includes(lowercasedFilter) ||
      v.make.toLowerCase().includes(lowercasedFilter) ||
      v.model.toLowerCase().includes(lowercasedFilter) ||
      v.ownerName.toLowerCase().includes(lowercasedFilter)
    ).slice(0, 10);
  }, [searchTerm, vehicles]);
  
  const handleConfirmAdd = () => {
    if (!selectedVehicle) {
      toast({ title: "Error", description: "Por favor, seleccione un vehículo.", variant: "destructive" });
      return;
    }
    if (dailyRentalCost === '' || dailyRentalCost <= 0) {
      toast({ title: "Error", description: "Por favor, ingrese un costo de renta diario válido.", variant: "destructive" });
      return;
    }
    onAddVehicle(selectedVehicle.id, Number(dailyRentalCost));
  };

  const resetState = () => {
    setSearchTerm('');
    setSelectedVehicle(null);
    setDailyRentalCost('');
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir Vehículo a la Flotilla</DialogTitle>
          <DialogDescription>
            Seleccione un vehículo existente para agregarlo a su flotilla y establezca el costo de renta.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vehículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              disabled={!!selectedVehicle}
            />
          </div>
          
          {!selectedVehicle ? (
            <ScrollArea className="h-60 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                  <Button
                    key={v.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                    onClick={() => setSelectedVehicle(v)}
                  >
                    <div>
                      <p className="font-medium">{v.licensePlate} - {v.make} {v.model}</p>
                      <p className="text-xs text-muted-foreground">{v.ownerName}</p>
                    </div>
                  </Button>
                )) : (
                  <p className="text-center text-sm text-muted-foreground p-4">
                    {vehicles.length === 0 ? "No hay vehículos para añadir." : "No se encontraron vehículos."}
                  </p>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
              <div className="p-3 border rounded-md bg-muted">
                <p className="font-semibold">{selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model}</p>
                <p className="text-sm text-muted-foreground">{selectedVehicle.ownerName}</p>
              </div>
              <div>
                <Label htmlFor="rental-cost">Costo de Renta Diario</Label>
                <div className="relative mt-1">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    id="rental-cost"
                    type="number"
                    placeholder="250.00"
                    value={dailyRentalCost}
                    onChange={(e) => setDailyRentalCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="pl-8"
                    />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirmAdd} disabled={!selectedVehicle}>
            <Car className="mr-2 h-4 w-4" />
            Añadir a Flotilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
