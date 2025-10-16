
//src/app/(app)/vehiculos/page.tsx
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Car, AlertTriangle, Activity, CalendarX, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Vehicle, InventoryItem, InventoryCategory, Supplier } from "@/types";
import { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehiclesTable } from './components/vehicles-table';
import { inventoryService } from '@/lib/services';
import { differenceInMonths, isValid } from 'date-fns';
import { parseDate } from '@/lib/forms';
import { VehicleDialog } from './components/vehicle-dialog';
import { DatabaseManagementTab } from './components/database-management-tab';

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'vehiculos';
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(true);

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribeVehicles = inventoryService.onVehiclesUpdate((data) => {
      setAllVehicles(data);
      setIsLoading(false);
    });
    
    return () => {
      unsubscribeVehicles();
    };
  }, []);

  const vehicleSummary = useMemo(() => {
    const now = new Date();
    const total = allVehicles.length;
    let recent = 0;
    let inactive6Months = 0;
    let inactive12Months = 0;

    allVehicles.forEach(v => {
      if (v.lastServiceDate) {
        const lastService = parseDate(v.lastServiceDate);
        if (lastService && isValid(lastService)) {
          const monthsSinceService = differenceInMonths(now, lastService);
          if (monthsSinceService <= 1) recent++;
          if (monthsSinceService >= 6) inactive6Months++;
          if (monthsSinceService >= 12) inactive12Months++;
        } else {
          inactive6Months++;
          inactive12Months++;
        }
      } else {
        inactive6Months++;
        inactive12Months++;
      }
    });

    return { total, recent, inactive6Months, inactive12Months };
  }, [allVehicles]);

  const handleSaveVehicle = async (data: VehicleFormValues, id?: string) => {
    try {
      await inventoryService.saveVehicle(data, id);
      toast({ title: `Vehículo ${id ? 'Actualizado' : 'Creado'}` });
      setIsVehicleDialogOpen(false);
    } catch (error) {
      console.error("Error saving vehicle: ", error);
      toast({
        title: "Error",
        description: `No se pudo guardar el vehículo. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await inventoryService.deleteCollectionDoc('vehicles', id);
      toast({ title: "Vehículo eliminado", variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el vehículo.", variant: "destructive" });
    }
  };
  
  const handleOpenVehicleDialog = (vehicle: Partial<Vehicle> | null = null) => {
    setEditingVehicle(vehicle);
    setIsVehicleDialogOpen(true);
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { value: "vehiculos", label: "Lista de Vehículos" },
    { value: "database", label: "Base de Datos" },
  ];

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Vehículos</h1>
            <p className="text-primary-foreground/80 mt-1">
              Administra la información y el historial de los vehículos de tus clientes.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {tabs.map((tabInfo) => (
              <TabsTrigger key={tabInfo.value} value={tabInfo.value}>
                {tabInfo.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="vehiculos" className="mt-6">
          <div className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Vehículos</CardTitle><Car className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{vehicleSummary.total}</div><p className="text-xs text-muted-foreground">Vehículos en la base de datos.</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{vehicleSummary.recent}</div><p className="text-xs text-muted-foreground">Visitaron el taller en los últimos 30 días.</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vehículos Inactivos</CardTitle><CalendarX className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{vehicleSummary.inactive6Months}</div><p className="text-xs text-muted-foreground">Sin servicio por más de 6 meses.</p></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vehículos en Riesgo</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{vehicleSummary.inactive12Months}</div><p className="text-xs text-muted-foreground">Sin servicio por más de 12 meses.</p></CardContent></Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <VehiclesTable
                  vehicles={allVehicles}
                  onSave={handleSaveVehicle}
                  onDelete={handleDeleteVehicle}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="database" className="mt-6">
            <DatabaseManagementTab />
        </TabsContent>
      </Tabs>
      
      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        onSave={handleSaveVehicle}
        vehicle={editingVehicle}
      />
    </>
  );
}

export default withSuspense(PageInner, null);
