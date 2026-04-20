// src/app/(app)/flotilla/components/drivers-list.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import type { FleetData } from "../hooks/use-fleet-data";
import type { Driver } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, Plus, UserCheck, UserX, Car } from "lucide-react";
import { personnelService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

interface DriversListProps {
  fleetData: FleetData;
  canManage: boolean;
}

export function DriversList({ fleetData, canManage }: DriversListProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);

  const allDrivers = useMemo(() => {
    let list = fleetData.drivers;
    if (!showArchived) list = list.filter(d => !d.isArchived);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.phone ?? "").includes(q) ||
        (d.assignedVehicleLicensePlate ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [fleetData.drivers, query, showArchived]);

  const totalPages = Math.max(1, Math.ceil(allDrivers.length / PAGE_SIZE));
  const paged = useMemo(() => allDrivers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [allDrivers, page]);

  const handleArchiveToggle = async (driver: Driver) => {
    await personnelService.saveDriver({ isArchived: !driver.isArchived }, driver.id);
    toast({ title: driver.isArchived ? "Conductor restaurado" : "Conductor dado de baja" });
  };

  const handleAddDriver = async () => {
    // Create a new driver document and redirect via router
    let newId: string | undefined;
    try {
      const { db } = await import("@/lib/firebaseClient");
      const { collection, addDoc } = await import("firebase/firestore");
      const docRef = await addDoc(collection(db, "drivers"), { name: "Nuevo Conductor", isArchived: false });
      newId = docRef.id;
    } catch {}
    if (newId) window.location.href = `/flotilla/conductores/${newId}`;
  };

  return (
    <div className="space-y-3">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, teléfono o placa..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          />
        </div>
        <Button
          variant={showArchived ? "secondary" : "outline-solid"}
          size="sm"
          className="h-10"
          onClick={() => setShowArchived(x => !x)}
        >
          {showArchived ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
          {showArchived ? "Solo activos" : "Ver archivados"}
        </Button>
        {canManage && (
          <Button size="sm" className="h-10 gap-2" onClick={handleAddDriver}>
            <Plus className="h-4 w-4" /> Nuevo Conductor
          </Button>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paged.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            No se encontraron conductores.
          </div>
        ) : paged.map(driver => {
          const vehicle = fleetData.getDriverVehicle(driver.id);
          return (
            <Link key={driver.id} href={`/flotilla/conductores/${driver.id}`}>
              <div className={cn(
                "group relative rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer",
                driver.isArchived ? "bg-muted/40 border-dashed opacity-70" : "bg-card hover:border-primary/40"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-base font-black text-white shrink-0",
                    driver.isArchived ? "bg-zinc-400" : vehicle ? "bg-linear-to-br from-indigo-500 to-purple-600" : "bg-amber-500"
                  )}>
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{driver.name}</p>
                      {driver.isArchived && (
                        <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                      )}
                    </div>
                    {driver.phone && (
                      <p className="text-xs text-muted-foreground">{driver.phone}</p>
                    )}
                    {vehicle ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Car className="h-3 w-3" />
                        <span className="font-mono">{vehicle.licensePlate}</span>
                        <span>·</span>
                        <span>{vehicle.make} {vehicle.model}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Car className="h-3 w-3" /> Sin vehículo asignado
                      </p>
                    )}
                    {vehicle?.dailyRentalCost && (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                        {formatCurrency(vehicle.dailyRentalCost)}/día
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allDrivers.length)} de {allDrivers.length}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
