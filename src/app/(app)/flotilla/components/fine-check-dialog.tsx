
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Vehicle } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface FineCheckDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fleetVehicles: Vehicle[];
  onConfirm: (checkedVehicleIds: string[]) => void;
}

export function FineCheckDialog({
  open,
  onOpenChange,
  fleetVehicles,
  onConfirm,
}: FineCheckDialogProps) {
  const { toast } = useToast();
  const [checkedVehicles, setCheckedVehicles] = useState<Record<string, boolean>>({});

  const handleVehicleCheck = (vehicleId: string, isChecked: boolean) => {
    setCheckedVehicles(prev => ({
      ...prev,
      [vehicleId]: isChecked,
    }));
  };
  
  const allVehiclesChecked = useMemo(() => {
    if (fleetVehicles.length === 0) return false;
    return fleetVehicles.every(v => checkedVehicles[v.id]);
  }, [checkedVehicles, fleetVehicles]);

  const handleConfirmClick = () => {
    if (!allVehiclesChecked) {
      toast({ title: "Revisión Incompleta", description: "Debe marcar todos los vehículos como revisados.", variant: "destructive" });
      return;
    }
    const checkedIds = Object.keys(checkedVehicles).filter(id => checkedVehicles[id]);
    onConfirm(checkedIds);
    setCheckedVehicles({}); // Reset for next time
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setCheckedVehicles({}); // Reset on close
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revisión Quincenal de Multas</DialogTitle>
          <DialogDescription>
            Marque cada vehículo para confirmar que ha sido revisado en el portal de finanzas correspondiente.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 pr-4 border rounded-md my-4">
            <div className="space-y-2 p-2">
            {fleetVehicles.length > 0 ? fleetVehicles.map(vehicle => (
                <div key={vehicle.id} className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50">
                <Checkbox
                    id={`check-${vehicle.id}`}
                    checked={!!checkedVehicles[vehicle.id]}
                    onCheckedChange={(checked) => handleVehicleCheck(vehicle.id, !!checked)}
                />
                <label
                    htmlFor={`check-${vehicle.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow"
                >
                    {vehicle.licensePlate} - <span className="text-muted-foreground">{vehicle.make} {vehicle.model}</span>
                </label>
                </div>
            )) : (
                <p className="text-center text-muted-foreground p-4">No hay vehículos en la flotilla para revisar.</p>
            )}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirmClick} disabled={!allVehiclesChecked}>Confirmar Revisión</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
