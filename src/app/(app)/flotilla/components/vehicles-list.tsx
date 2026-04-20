// src/app/(app)/flotilla/components/vehicles-list.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import type { FleetData } from "../hooks/use-fleet-data";
import type { Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, Car, User } from "lucide-react";

const PAGE_SIZE = 20;

interface VehiclesListProps {
  fleetData: FleetData;
  canManage: boolean;
}

export function VehiclesList({ fleetData, canManage }: VehiclesListProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const fleetVehicles = useMemo(() => {
    let list = fleetData.fleetVehicles;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(v =>
        v.licensePlate.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.ownerName ?? "").toLowerCase().includes(q) ||
        (v.assignedDriverName ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [fleetData.fleetVehicles, query]);

  const totalPages = Math.max(1, Math.ceil(fleetVehicles.length / PAGE_SIZE));
  const paged = useMemo(() => fleetVehicles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [fleetVehicles, page]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por placa, marca, modelo o propietario..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paged.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-xl border-dashed">
            No se encontraron vehículos en flotilla.
          </div>
        ) : paged.map(vehicle => {
          const assignedDriver = fleetData.drivers.find(d => d.id === vehicle.assignedDriverId);
          return (
            <Link key={vehicle.id} href={`/flotilla/vehiculos/${vehicle.id}`}>
              <div className="group relative rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer">
                {/* Plate + make */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-linear-to-br from-indigo-900 to-purple-900 flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black font-mono text-base tracking-wide">{vehicle.licensePlate}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model} · {vehicle.year}</p>
                  </div>
                </div>

                {/* Daily rate */}
                {vehicle.dailyRentalCost && (
                  <div className="mb-2 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    <span className="text-[11px] font-bold text-emerald-700">{formatCurrency(vehicle.dailyRentalCost)}/día</span>
                  </div>
                )}

                {/* Assigned driver */}
                {assignedDriver ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{assignedDriver.name}</span>
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Activo</Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Sin conductor asignado
                  </p>
                )}

                {vehicle.ownerName && (
                  <p className="text-[10px] text-muted-foreground mt-1">Propietario: {vehicle.ownerName}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, fleetVehicles.length)} de {fleetVehicles.length}
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
