
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
import { VehicleCatalogManager } from './components/vehicle-catalog-manager';
import { VehicleAuditManager } from './components/vehicle-audit-manager';
import { inventoryService } from '@/lib/services';
import { VehicleDialog } from './components/vehicle-dialog';
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

type ActiveView = "vehiculos" | "marcas" | "auditoria";

const TABS: { value: ActiveView; label: string }[] = [
  { value: "vehiculos", label: "Directorio de Vehículos" },
  { value: "auditoria", label: "Auditoría de Datos" },
  { value: "marcas", label: "Catálogo de Marcas y Modelos" }
];

function PageInner() {
  const router = useRouter();
  const { toast } = useToast();
  const userPermissions = usePermissions();

  const [activeView, setActiveView] = useState<ActiveView>("vehiculos");
  const [isLoading, setIsLoading] = useState(true);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = inventoryService.onVehiclesUpdate((data) => {
      setAllVehicles(data);
      setIsLoading(false);
    });
    
    // Fallback if the export isn't defined yet (since it's a hot change)
    let unsubStats = () => {};
    if (inventoryService.onSystemVehicleStatsUpdate) {
        unsubStats = inventoryService.onSystemVehicleStatsUpdate((stats) => {
            setSystemStats(stats);
        });
    }

    return () => { unsub(); unsubStats(); };
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
      
      {/* ── Top Header Row (Title + Tabs) ────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Directorio de Vehículos</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Administra los vehículos de tus clientes y el catálogo de marcas y modelos.
          </p>
        </div>

        {/* ── Pill tab navigation ─────────────────────────────────── */}
        <div className="flex gap-1 p-1.5 bg-muted/70 backdrop-blur-xs rounded-xl overflow-x-auto ring-1 ring-muted mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveView(tab.value)}
              className={cn(
                "shrink-0 flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap",
                activeView === tab.value
                  ? "bg-white text-black shadow-md ring-1 ring-black/10 dark:bg-slate-800 dark:text-white dark:ring-white/10 scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {activeView === 'vehiculos' && (
        <VehiclesTable
          vehicles={allVehicles}
          systemStats={systemStats}
          permissions={userPermissions}
          onSave={handleSaveVehicle}
          onDelete={handleDeleteVehicle}
          onAdd={() => handleOpenVehicleDialog()}
          onEdit={(v) => handleOpenVehicleDialog(v)}
        />
      )}

      {activeView === 'marcas' && (
        <VehicleCatalogManager />
      )}

      {activeView === 'auditoria' && (
        <VehicleAuditManager 
          vehicles={allVehicles} 
          permissions={userPermissions} 
          onEdit={(v) => handleOpenVehicleDialog(v)} 
          onDelete={handleDeleteVehicle} 
        />
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
