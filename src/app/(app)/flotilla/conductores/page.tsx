// src/app/(app)/flotilla/conductores/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { personnelService } from '@/lib/services';
import type { Driver } from '@/types';
import { Loader2 } from 'lucide-react';
import { FlotillaConductoresTab } from './components/FlotillaConductoresTab';
import { DriverDialog } from './components/DriverDialog';
import type { DriverFormValues } from '@/schemas/driver-form-schema';
import { useToast } from '@/hooks/use-toast';

export default function ConductoresPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  useEffect(() => {
    const unsubscribe = personnelService.onDriversUpdate((data) => {
      setDrivers(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const handleAddDriver = () => {
    setEditingDriver(null);
    setIsDriverDialogOpen(true);
  };
  
  const handleSaveDriver = async (data: DriverFormValues) => {
    await personnelService.saveDriver(data, editingDriver?.id);
    toast({ title: `Conductor ${editingDriver ? 'actualizado' : 'creado'}.`});
    setIsDriverDialogOpen(false);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <FlotillaConductoresTab drivers={drivers} onAddDriver={handleAddDriver} />
      <DriverDialog 
        open={isDriverDialogOpen}
        onOpenChange={setIsDriverDialogOpen}
        driver={editingDriver}
        onSave={handleSaveDriver}
      />
    </>
  );
}
