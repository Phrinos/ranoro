
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { GlobalTransactionDialog, type GlobalTransactionFormValues } from './GlobalTransactionDialog';
import { rentalService } from '@/lib/services/rental.service';
import { useToast } from '@/hooks/use-toast';
import type { Driver, Vehicle, PaymentMethod } from '@/types';

interface RegistrarAbonoProps {
  drivers: Driver[];
  vehicles: Vehicle[];
}

export function RegistrarAbono({ drivers, vehicles }: RegistrarAbonoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = async (data: GlobalTransactionFormValues) => {
    const driver = drivers.find(d => d.id === data.driverId);
    if (!driver) return toast({ title: "Error", description: "Conductor no encontrado.", variant: "destructive" });
    
    const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
    if (!vehicle) return toast({ title: "Error", description: "El conductor no tiene un vehículo asignado.", variant: "destructive" });

    try {
        await rentalService.addRentalPayment(driver, vehicle, data.amount, data.note, data.date, data.paymentMethod as PaymentMethod);
        toast({ title: "Abono Registrado", description: `Se registró el pago de ${driver.name} correctamente.` });
        setIsOpen(false);
    } catch(e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Registrar Abono
      </Button>

      <GlobalTransactionDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        drivers={drivers.filter(d => !d.isArchived)}
        onSave={handleSave}
        transactionType="payment"
      />
    </>
  );
}
