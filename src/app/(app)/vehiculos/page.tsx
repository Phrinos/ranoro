
// src/app/(app)/vehiculos/page.tsx
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import type { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { VehiclesTable } from './components/vehicles-table';
import { inventoryService } from '@/lib/services';
import { VehicleDialog } from './components/vehicle-dialog';
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { DatabaseManagementTab } from './components/database-management-tab';

type ActiveView = "vehiculos" | "catalogo";

const TABS: { value: ActiveView; label: string }[] = [
  { value: "vehiculos", label: "Directorio de Vehículos" },
  { value: "catalogo", label: "Catálogo de Marcas y Modelos" },
];

function PageInner() {
  const router = useRouter();
  const { toast } = useToast();
  const userPermissions = usePermissions();

  const [activeView, setActiveView] = useState<ActiveView>("vehiculos");
  const [isLoading, setIsLoading] = useState(true);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = inventoryService.onVehiclesUpdate((data) => {
      setAllVehicles(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveVehicle = async (data: any) => {
    try {
      await inventoryService.saveVehicle(data, editingVehicle?.id);
      toast({ title: `Vehículo ${editingVehicle?.id ? 'Actualizado' : 'Registrado'} correctamente` });
      setIsVehicleDialogOpen(false);
      setEditingVehicle(null);
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: `${error instanceof Error ? error.message : 'Intenta de nuevo.'}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await inventoryService.deleteCollectionDoc('vehicles', id);
      toast({ title: "Vehículo eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el vehículo.", variant: "destructive" });
    }
  };

  const handleOpenVehicleDialog = (vehicle: Partial<Vehicle> | null = null) => {
    setEditingVehicle(vehicle);
    setIsVehicleDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center flex-col items-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Cargando directorio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header (sin banner rojo) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Directorio de Vehículos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra los vehículos de tus clientes y el catálogo de marcas y modelos.
          </p>
        </div>
        {userPermissions.has('fleet:create') && activeView === 'vehiculos' && (
          <Button onClick={() => handleOpenVehicleDialog()} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Vehículo
          </Button>
        )}
      </div>

      {/* ── Pill tab navigation ─────────────────────────────────── */}
      <div className="inline-flex flex-wrap gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveView(tab.value)}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeView === tab.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {activeView === 'vehiculos' && (
        <VehiclesTable
          vehicles={allVehicles}
          onSave={handleSaveVehicle}
          onDelete={handleDeleteVehicle}
          onAdd={() => handleOpenVehicleDialog()}
        />
      )}
      {activeView === 'catalogo' && (
        <DatabaseManagementTab />
      )}

      <VehicleDialog
        open={isVehicleDialogOpen}
        onOpenChange={(open) => {
          setIsVehicleDialogOpen(open);
          if (!open) setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
        vehicle={editingVehicle}
      />
    </div>
  );
}

export default withSuspense(PageInner, null);
