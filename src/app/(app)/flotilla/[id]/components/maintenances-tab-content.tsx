
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench } from 'lucide-react';
import { placeholderServiceRecords, persistToFirestore, placeholderVehicles, placeholderTechnicians, placeholderInventory } from '@/lib/placeholder-data';
import type { ServiceRecord, QuoteRecord } from '@/types';
import { format, parseISO, compareAsc, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ServiceDialog } from '../../../servicios/components/service-dialog';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface GroupedServices {
  [monthYearKey: string]: { // key is "YYYY-MM"
    displayMonthYear: string;
    services: ServiceRecord[];
    totalCost: number;
  };
}

interface MaintenancesTabContentProps {
  vehicleId: string;
}

export function MaintenancesTabContent({ vehicleId }: MaintenancesTabContentProps) {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const vehicleServices = placeholderServiceRecords
      .filter(s => s.vehicleId === vehicleId)
      .sort((a, b) => parseISO(b.serviceDate).getTime() - parseISO(a.serviceDate).getTime());
    setServices(vehicleServices);
  }, [vehicleId]);

  const groupedServices = useMemo(() => {
    return services.reduce((acc: GroupedServices, service) => {
      const serviceDate = parseISO(service.serviceDate);
      if (!isValid(serviceDate)) return acc;

      const monthYearKey = format(serviceDate, 'yyyy-MM');
      const displayMonthYear = format(serviceDate, "MMMM 'de' yyyy", { locale: es });

      if (!acc[monthYearKey]) {
        acc[monthYearKey] = {
            displayMonthYear,
            services: [],
            totalCost: 0
        };
      }
      acc[monthYearKey].services.push(service);
      acc[monthYearKey].totalCost += service.totalCost;
      return acc;
    }, {});
  }, [services]);

  const handleOpenService = (service: ServiceRecord) => {
    setEditingService(service);
    setIsEditDialogOpen(true);
  };

  const handleServiceUpdated = useCallback(async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) return;
    const updatedService = data as ServiceRecord;

    setServices(prevServices =>
      prevServices.map(s => (s.id === updatedService.id ? updatedService : s))
    );
    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedService;
    }
    await persistToFirestore(['serviceRecords']);
    setIsEditDialogOpen(false);
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${updatedService.id} ha sido actualizado.`,
    });
  }, [toast]);

  return (
    <>
      {Object.keys(groupedServices).length > 0 ? (
        Object.entries(groupedServices).sort((a,b) => b[0].localeCompare(a[0])).map(([key, monthData]) => (
          <Card key={key} className="mb-6">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="capitalize">{monthData.displayMonthYear}</CardTitle>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Costo Total del Mes</p>
                        <p className="text-lg font-bold text-destructive">-{formatCurrency(monthData.totalCost)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black"><TableRow><TableHead className="text-white">Fecha</TableHead><TableHead className="text-white">Kilometraje</TableHead><TableHead className="text-white">Servicio</TableHead><TableHead className="text-right text-white">Costo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {monthData.services.sort((a, b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate))).map(service => (
                      <TableRow key={service.id} onClick={() => handleOpenService(service)} className="cursor-pointer">
                        <TableCell>{format(parseISO(service.serviceDate), "dd MMM, HH:mm", { locale: es })}</TableCell>
                        <TableCell>{formatNumber(service.mileage)} km</TableCell>
                        <TableCell>{service.description}</TableCell>
                        <TableCell className="text-right text-destructive">-{formatCurrency(service.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Wrench className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">Sin Historial de Mantenimiento</h3>
            <p className="text-sm">No se han registrado servicios para este vehículo.</p>
        </div>
      )}
      
      {editingService && (
        <ServiceDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          service={editingService}
          vehicles={placeholderVehicles} 
          technicians={placeholderTechnicians}
          inventoryItems={placeholderInventory}
          onSave={handleServiceUpdated}
          mode="service"
        />
      )}
    </>
  );
}
