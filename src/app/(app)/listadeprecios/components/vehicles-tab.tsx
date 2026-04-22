// src/app/(app)/listadeprecios/components/vehicles-tab.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2, Car, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleMatch, PricingGroup } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  group: Partial<PricingGroup>;
  onChange: (updated: Partial<PricingGroup>) => void;
}

const emptyVehicle = (): VehicleMatch => ({
  make: "",
  model: "",
  yearFrom: 2015,
  yearTo: CURRENT_YEAR,
  engine: "",
});

export function VehiclesTab({ group, onChange }: Props) {
  const vehicles = group.vehicles ?? [];
  const [adding, setAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState<VehicleMatch>(emptyVehicle());

  const update = (vehicles: VehicleMatch[]) => onChange({ ...group, vehicles });

  const handleAdd = () => {
    if (!newVehicle.make.trim() || !newVehicle.model.trim()) return;
    const v: VehicleMatch = {
      ...newVehicle,
      make: newVehicle.make.trim().toUpperCase(),
      model: newVehicle.model.trim().toUpperCase(),
      engine: newVehicle.engine?.trim() || undefined,
    };
    update([...vehicles, v]);
    setNewVehicle(emptyVehicle());
    setAdding(false);
  };

  const handleRemove = (idx: number) => {
    update(vehicles.filter((_, i) => i !== idx));
  };

  const handleOilChange = (val: string) => {
    onChange({ ...group, oilCapacityLiters: parseFloat(val) || 0 });
  };

  return (
    <div className="space-y-6">
      {/* Oil capacity — shared for all vehicles in this group */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Fuel className="h-5 w-5 text-amber-600" />
            <Label className="font-bold text-amber-900">Capacidad de Aceite</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min="0"
              value={group.oilCapacityLiters ?? ""}
              onChange={e => handleOilChange(e.target.value)}
              className="w-24 bg-white border-amber-300 text-center font-bold"
              placeholder="4.5"
            />
            <span className="text-sm font-medium text-amber-800">litros</span>
          </div>
          <p className="text-xs text-amber-700">
            Este valor se usa para calcular el costo de aceite en los servicios.
          </p>
        </CardContent>
      </Card>

      {/* Vehicles list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm">Vehículos Compatibles</h4>
            <p className="text-xs text-muted-foreground">Ya sea principal o que comparta motor.</p>
          </div>
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5 bg-black text-white hover:bg-zinc-800">
            <PlusCircle className="h-4 w-4" /> Agregar
          </Button>
        </div>

        {vehicles.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl text-muted-foreground gap-2">
            <Car className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">Sin vehículos. Agrega el primero.</p>
          </div>
        )}

        <div className="space-y-2">
          {vehicles.map((v, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl border bg-white shadow-xs group"
            >
              <div className="h-9 w-9 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                <Car className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">
                  {v.make} {v.model}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{v.yearFrom}–{v.yearTo}</Badge>
                  {v.engine && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-800 border-amber-200">{v.engine}</Badge>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add vehicle form */}
        {adding && (
          <Card className="border-dashed border-2 border-zinc-300">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-bold text-muted-foreground">Nuevo Vehículo Compatible</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Marca *</Label>
                  <Input
                    placeholder="NISSAN, KIA, TOYOTA…"
                    value={newVehicle.make}
                    onChange={e => setNewVehicle(v => ({ ...v, make: e.target.value.toUpperCase() }))}
                    className="bg-white uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Modelo *</Label>
                  <Input
                    placeholder="VERSA, MARCH, RIO…"
                    value={newVehicle.model}
                    onChange={e => setNewVehicle(v => ({ ...v, model: e.target.value.toUpperCase() }))}
                    className="bg-white uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Año Desde</Label>
                  <Input
                    type="number"
                    min="1990"
                    max={CURRENT_YEAR + 2}
                    value={newVehicle.yearFrom}
                    onChange={e => setNewVehicle(v => ({ ...v, yearFrom: parseInt(e.target.value) || 2015 }))}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Año Hasta</Label>
                  <Input
                    type="number"
                    min="1990"
                    max={CURRENT_YEAR + 2}
                    value={newVehicle.yearTo}
                    onChange={e => setNewVehicle(v => ({ ...v, yearTo: parseInt(e.target.value) || CURRENT_YEAR }))}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Motor <span className="text-muted-foreground">(opcional — solo si hay variantes)</span></Label>
                  <Input
                    placeholder="1.6L, 2.0L, 1.5T…"
                    value={newVehicle.engine}
                    onChange={e => setNewVehicle(v => ({ ...v, engine: e.target.value }))}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewVehicle(emptyVehicle()); }}>Cancelar</Button>
                <Button size="sm" className="bg-black text-white hover:bg-zinc-800" onClick={handleAdd} disabled={!newVehicle.make.trim() || !newVehicle.model.trim()}>
                  Agregar Vehículo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
