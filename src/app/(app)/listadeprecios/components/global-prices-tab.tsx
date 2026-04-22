// src/app/(app)/listadeprecios/components/global-prices-tab.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PlusCircle, Trash2, Droplets, Package, Save, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { OilType, PartTypeCatalogEntry } from "@/types";
import { DEFAULT_PART_TYPES } from "../lib/pricing-calc";
import { nanoid } from "nanoid";

const UNITS = ["pieza", "par", "juego", "kit", "litro"];
const VISCOSITIES = ["0W-20", "5W-20", "5W-30", "5W-40", "10W-30", "10W-40", "15W-40", "20W-50"];

interface Props {
  oils: OilType[];
  partTypes: PartTypeCatalogEntry[];
  onSaveOils: (oils: OilType[]) => Promise<void>;
  onSavePartType: (entry: Omit<PartTypeCatalogEntry, "id">, id?: string) => Promise<void>;
  onDeletePartType: (id: string) => Promise<void>;
}

export function GlobalPricesTab({ oils, partTypes, onSaveOils, onSavePartType, onDeletePartType }: Props) {
  // ── Oils state ────────────────────────────────────────────
  const [draftOils, setDraftOils] = useState<OilType[]>(oils);
  const [savingOils, setSavingOils] = useState(false);
  const [addingOil, setAddingOil] = useState(false);
  const [newOil, setNewOil] = useState<Omit<OilType, "id">>({ name: "", brand: "", viscosity: "", costPerLiter: 0, pricePerLiter: 0 });

  // Sync if parent updates
  React.useEffect(() => { setDraftOils(oils); }, [oils]);

  const updateOilField = (id: string, field: keyof OilType, value: any) => {
    setDraftOils(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const removeOil = (id: string) => setDraftOils(prev => prev.filter(o => o.id !== id));

  const addOil = () => {
    if (!newOil.name.trim() || !newOil.brand.trim()) return;
    const oil: OilType = { ...newOil, id: nanoid(8) };
    setDraftOils(prev => [...prev, oil]);
    setNewOil({ name: "", brand: "", viscosity: "", costPerLiter: 0, pricePerLiter: 0 });
    setAddingOil(false);
  };

  const handleSaveOils = async () => {
    setSavingOils(true);
    try { await onSaveOils(draftOils); } finally { setSavingOils(false); }
  };

  // ── Part types state ──────────────────────────────────────
  const [addingPartType, setAddingPartType] = useState(false);
  const [newPartType, setNewPartType] = useState({ name: "", unit: "pieza" });
  const [savingPartType, setSavingPartType] = useState(false);

  const handleSeedDefaults = async () => {
    const existing = new Set(partTypes.map(p => p.name));
    for (const d of DEFAULT_PART_TYPES) {
      if (!existing.has(d.name)) {
        await onSavePartType({ ...d, order: partTypes.length }, undefined);
      }
    }
  };

  const handleAddPartType = async () => {
    if (!newPartType.name.trim()) return;
    setSavingPartType(true);
    try {
      await onSavePartType({ ...newPartType, order: partTypes.length });
      setNewPartType({ name: "", unit: "pieza" });
      setAddingPartType(false);
    } finally { setSavingPartType(false); }
  };

  return (
    <div className="space-y-8">
      {/* ── OILS ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-5 w-5 text-amber-500" /> Precios de Aceite
              <span className="text-xs font-normal text-muted-foreground ml-1">— aplica a todos los vehículos</span>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddingOil(true)} className="gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" /> Agregar Aceite
              </Button>
              <Button size="sm" className="gap-1.5 bg-black text-white hover:bg-zinc-800" onClick={handleSaveOils} disabled={savingOils}>
                {savingOils ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {/* Add oil form */}
          {addingOil && (
            <div className="border border-dashed rounded-xl p-3 bg-zinc-50 space-y-2">
              <p className="text-xs font-bold text-zinc-500">Nuevo Aceite</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div><Label className="text-[10px]">Tipo *</Label><Input value={newOil.name} onChange={e => setNewOil(o => ({ ...o, name: e.target.value }))} className="h-8 text-xs bg-white" placeholder="Sintético, Mineral…" /></div>
                <div><Label className="text-[10px]">Marca *</Label><Input value={newOil.brand} onChange={e => setNewOil(o => ({ ...o, brand: e.target.value }))} className="h-8 text-xs bg-white" placeholder="Mobil 1, Castrol…" /></div>
                <div>
                  <Label className="text-[10px]">Viscosidad</Label>
                  <Select value={newOil.viscosity} onValueChange={v => setNewOil(o => ({ ...o, viscosity: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="5W-30…" /></SelectTrigger>
                    <SelectContent>{VISCOSITIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Costo / litro</Label><Input type="number" min={0} value={newOil.costPerLiter} onChange={e => setNewOil(o => ({ ...o, costPerLiter: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs bg-white" /></div>
                <div><Label className="text-[10px]">Precio / litro</Label><Input type="number" min={0} value={newOil.pricePerLiter} onChange={e => setNewOil(o => ({ ...o, pricePerLiter: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs bg-white" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddingOil(false)}>Cancelar</Button>
                <Button size="sm" className="h-7 text-xs bg-black text-white" onClick={addOil} disabled={!newOil.name.trim() || !newOil.brand.trim()}>Agregar</Button>
              </div>
            </div>
          )}

          {draftOils.length === 0 && !addingOil && (
            <p className="text-sm text-muted-foreground text-center py-6">Sin aceites registrados.</p>
          )}

          {draftOils.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50">
                    <TableHead className="font-bold text-amber-900">Aceite</TableHead>
                    <TableHead className="font-bold text-amber-900">Marca</TableHead>
                    <TableHead className="font-bold text-amber-900">Viscosidad</TableHead>
                    <TableHead className="font-bold text-amber-900 text-right">Costo/L</TableHead>
                    <TableHead className="font-bold text-amber-900 text-right">Precio/L</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftOils.map(oil => (
                    <TableRow key={oil.id} className="hover:bg-amber-50/30">
                      <TableCell>
                        <Input value={oil.name} onChange={e => updateOilField(oil.id, "name", e.target.value)} className="h-7 text-xs bg-white border-zinc-200 w-32" />
                      </TableCell>
                      <TableCell>
                        <Input value={oil.brand} onChange={e => updateOilField(oil.id, "brand", e.target.value)} className="h-7 text-xs bg-white border-zinc-200 w-24" />
                      </TableCell>
                      <TableCell>
                        <Select value={oil.viscosity ?? ""} onValueChange={v => updateOilField(oil.id, "viscosity", v)}>
                          <SelectTrigger className="h-7 text-xs bg-white w-24"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{VISCOSITIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" value={oil.costPerLiter} onChange={e => updateOilField(oil.id, "costPerLiter", parseFloat(e.target.value) || 0)} className="h-7 text-xs bg-white border-zinc-200 text-right w-20 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" value={oil.pricePerLiter} onChange={e => updateOilField(oil.id, "pricePerLiter", parseFloat(e.target.value) || 0)} className="h-7 text-xs bg-white border-zinc-200 text-right w-20 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeOil(oil.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PART TYPES CATALOG ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-zinc-500" /> Catálogo de Insumos
              <span className="text-xs font-normal text-muted-foreground ml-1">— tipos disponibles para todos los vehículos</span>
            </CardTitle>
            <div className="flex gap-2">
              {partTypes.length === 0 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSeedDefaults}>
                  Cargar Defaults
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddingPartType(true)}>
                <PlusCircle className="h-3.5 w-3.5" /> Agregar Tipo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {addingPartType && (
            <div className="border border-dashed rounded-xl p-3 bg-zinc-50 space-y-2">
              <p className="text-xs font-bold text-zinc-500">Nuevo Tipo de Insumo</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Nombre *</Label><Input value={newPartType.name} onChange={e => setNewPartType(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs bg-white" placeholder="Bujía Iridio…" /></div>
                <div>
                  <Label className="text-[10px]">Unidad</Label>
                  <Select value={newPartType.unit} onValueChange={v => setNewPartType(p => ({ ...p, unit: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddingPartType(false)}>Cancelar</Button>
                <Button size="sm" className="h-7 text-xs bg-black text-white" onClick={handleAddPartType} disabled={savingPartType || !newPartType.name.trim()}>
                  {savingPartType ? <Loader2 className="h-3 w-3 animate-spin" /> : "Agregar"}
                </Button>
              </div>
            </div>
          )}

          {partTypes.length === 0 && !addingPartType && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin tipos definidos. Usa "Cargar Defaults" o agrega los tuyos.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {partTypes.map(pt => (
              <div key={pt.id} className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium group">
                <span>{pt.name}</span>
                <span className="text-zinc-400">({pt.unit})</span>
                <button
                  onClick={() => onDeletePartType(pt.id)}
                  className="ml-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
