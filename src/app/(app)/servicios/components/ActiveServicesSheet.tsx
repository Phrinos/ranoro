
// src/app/(app)/servicios/components/ActiveServicesSheet.tsx
"use client";

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ServiceRecord, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ActiveServicesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceRecord[];
  vehicles: Vehicle[];
}

export function ActiveServicesSheet({ open, onOpenChange, services, vehicles }: ActiveServicesSheetProps) {
  const router = useRouter();

  const handleServiceClick = (serviceId: string) => {
    onOpenChange(false);
    // Usamos replace para no añadir al historial de navegación si el usuario solo está cambiando entre servicios activos
    router.replace(`/servicios/${serviceId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-sm p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Servicios en Taller</SheetTitle>
          <SheetDescription>
            Lista de todos los vehículos actualmente en el taller.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-4">
            {services.length > 0 ? services.map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const works = service.serviceItems.map(item => item.name).join(', ');
              return (
                <Card key={service.id} onClick={() => handleServiceClick(service.id)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-tight">
                      {vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Vehículo no asignado'}
                      <span className="block text-sm font-mono text-muted-foreground">{vehicle?.licensePlate}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>
                        <p className="font-semibold text-xs text-muted-foreground">Trabajos:</p>
                        <p className="text-foreground truncate">{works || 'No especificados'}</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <Badge variant="outline" className="text-primary">{service.subStatus || 'Sin Sub-estado'}</Badge>
                      <p className="font-bold text-lg">{formatCurrency(service.totalCost || 0)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : (
                <div className="text-center text-muted-foreground pt-10">
                    <p>No hay servicios "En Taller" por el momento.</p>
                </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
