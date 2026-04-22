// src/app/(app)/listadeprecios/components/group-detail.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  PlusCircle, Trash2, Car, Wrench, Package,
  ChevronDown, ChevronUp, Save, ArrowLeft, Fuel,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { PricingGroup, VehiclePart, ServiceTemplate, ServiceComponent, OilType, PartTypeCatalogEntry, VehicleMatch } from "@/types";
import { calcServicePrice, generateGroupName } from "../lib/pricing-calc";
import { nanoid } from "nanoid";

const CURRENT_YEAR = new Date().getFullYear();
const UNITS = ["pieza", "par", "juego", "kit", "litro"];

interface Props {
  group: PricingGroup;
  oils: OilType[];
  partTypes: PartTypeCatalogEntry[];
  onSave: (updated: PricingGroup) => Promise<void>;
  onBack: () => void;
}

export function GroupDetail({ group: initialGroup, oils, partTypes, onSave, onBack }: Props) {
  const [group, setGroup] = useState<PricingGroup>({ ...initialGroup });
  const [isSaving, setIsSaving] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────
  const updateGroup = (patch: Partial<PricingGroup>) => {
    setGroup(g => {
      const updated = { ...g, ...patch };
      // Auto-update name if vehicles changed
      if (patch.vehicles) updated.name = generateGroupName(patch.vehicles);
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try { await onSave(group); } finally { setIsSaving(false); }
  };

  // ── Vehicles section ───────────────────────────────────────────────
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState<VehicleMatch>({ make: "", model: "", yearFrom: 2015, yearTo: CURRENT_YEAR });

  const addVehicle = () => {
    if (!newVehicle.make.trim() || !newVehicle.model.trim()) return;
    updateGroup({ vehicles: [...group.vehicles, { ...newVehicle, make: newVehicle.make.toUpperCase(), model: newVehicle.model.toUpperCase(), engine: newVehicle.engine?.trim() || undefined }] });
    setNewVehicle({ make: "", model: "", yearFrom: 2015, yearTo: CURRENT_YEAR });
    setAddingVehicle(false);
  };

  const removeVehicle = (idx: number) => updateGroup({ vehicles: group.vehicles.filter((_, i) => i !== idx) });

  // ── Parts section ─────────────────────────────────────────────────
  const [addingPart, setAddingPart] = useState(false);
  const [newPart, setNewPart] = useState<Omit<VehiclePart, "id">>({ typeName: "", brand: "", partNumber: "", sku: "", cost: 0, price: 0, unit: "pieza" });

  const addPart = () => {
    if (!newPart.typeName.trim() || !newPart.brand.trim()) return;
    const part: VehiclePart = { ...newPart, id: nanoid(8) };
    updateGroup({ parts: [...(group.parts ?? []), part] });
    setNewPart({ typeName: "", brand: "", partNumber: "", sku: "", cost: 0, price: 0, unit: "pieza" });
    setAddingPart(false);
  };

  const removePart = (id: string) => {
    updateGroup({ parts: group.parts.filter(p => p.id !== id) });
    // Also remove references in services
    updateGroup({ services: group.services.map(svc => ({ ...svc, components: svc.components.filter(c => c.partId !== id) })) });
  };

  const updatePartField = (id: string, field: keyof VehiclePart, value: any) => {
    updateGroup({ parts: group.parts.map(p => p.id === id ? { ...p, [field]: value } : p) });
  };

  // ── Services section ──────────────────────────────────────────────
  const [addingService, setAddingService] = useState(false);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcLaborCost, setNewSvcLaborCost] = useState(0);
  const [newSvcLaborPrice, setNewSvcLaborPrice] = useState(0);

  const addService = () => {
    if (!newSvcName.trim()) return;
    const svc: ServiceTemplate = { id: nanoid(8), name: newSvcName.trim(), laborCost: newSvcLaborCost, laborPrice: newSvcLaborPrice, components: [] };
    updateGroup({ services: [...(group.services ?? []), svc] });
    setNewSvcName(""); setNewSvcLaborCost(0); setNewSvcLaborPrice(0);
    setAddingService(false);
    setExpandedServiceId(svc.id);
  };

  const removeService = (id: string) => updateGroup({ services: group.services.filter(s => s.id !== id) });

  const updateServiceField = (id: string, field: keyof ServiceTemplate, value: any) => {
    updateGroup({ services: group.services.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const addComponent = (serviceId: string, comp: ServiceComponent) => {
    updateGroup({ services: group.services.map(s => s.id === serviceId ? { ...s, components: [...s.components, comp] } : s) });
  };

  const removeComponent = (serviceId: string, compIdx: number) => {
    updateGroup({ services: group.services.map(s => s.id === serviceId ? { ...s, components: s.components.filter((_, i) => i !== compIdx) } : s) });
  };

  const updateComponent = (serviceId: string, compIdx: number, patch: Partial<ServiceComponent>) => {
    updateGroup({ services: group.services.map(s => s.id === serviceId ? { ...s, components: s.components.map((c, i) => i === compIdx ? { ...c, ...patch } : c) } : s) });
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-black">{group.name || "Nuevo Grupo"}</h2>
            <p className="text-xs text-muted-foreground">{group.vehicles?.length ?? 0} vehículo{group.vehicles?.length !== 1 ? "s" : ""} · {group.parts?.length ?? 0} insumos · {group.services?.length ?? 0} trabajos</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white hover:bg-primary/90 gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Guardando…" : "Guardar Todo"}
        </Button>
      </div>

      {/* ── TOP: Vehicles ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Car className="h-4 w-4 text-zinc-500" /> Vehículos del Grupo
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-amber-500" />
                <Input
                  type="number" step="0.5" min="0"
                  value={group.oilCapacityLiters ?? ""}
                  onChange={e => updateGroup({ oilCapacityLiters: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-7 text-xs text-center bg-amber-50 border-amber-200 font-bold"
                />
                <span className="text-xs text-amber-700 font-medium">litros de aceite</span>
              </div>
              <Button size="sm" className="h-7 text-xs gap-1 bg-primary text-white hover:bg-primary/90" onClick={() => setAddingVehicle(true)}>
                <PlusCircle className="h-3.5 w-3.5" /> Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {(group.vehicles ?? []).map((v, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-zinc-100 rounded-lg px-3 py-1.5 text-xs font-medium group">
                <span>{v.make} {v.model}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{v.yearFrom}–{v.yearTo}</Badge>
                {v.engine && <Badge className="text-[10px] px-1 py-0 bg-amber-100 text-amber-800 border-0">{v.engine}</Badge>}
                <button onClick={() => removeVehicle(i)} className="ml-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
            {!group.vehicles?.length && <p className="text-xs text-muted-foreground">Sin vehículos. Agrega el primero.</p>}
          </div>

          {addingVehicle && (
            <div className="border border-dashed rounded-xl p-3 bg-zinc-50 space-y-2 mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><Label className="text-[10px]">Marca *</Label><Input value={newVehicle.make} onChange={e => setNewVehicle(v => ({ ...v, make: e.target.value.toUpperCase() }))} className="h-8 text-xs bg-white uppercase" placeholder="NISSAN" /></div>
                <div><Label className="text-[10px]">Modelo *</Label><Input value={newVehicle.model} onChange={e => setNewVehicle(v => ({ ...v, model: e.target.value.toUpperCase() }))} className="h-8 text-xs bg-white uppercase" placeholder="VERSA" /></div>
                <div><Label className="text-[10px]">Desde</Label><Input type="number" value={newVehicle.yearFrom} onChange={e => setNewVehicle(v => ({ ...v, yearFrom: parseInt(e.target.value) || 2015 }))} className="h-8 text-xs bg-white" /></div>
                <div><Label className="text-[10px]">Hasta</Label><Input type="number" value={newVehicle.yearTo} onChange={e => setNewVehicle(v => ({ ...v, yearTo: parseInt(e.target.value) || CURRENT_YEAR }))} className="h-8 text-xs bg-white" /></div>
                <div className="col-span-2 sm:col-span-4"><Label className="text-[10px]">Motor (opcional)</Label><Input value={newVehicle.engine ?? ""} onChange={e => setNewVehicle(v => ({ ...v, engine: e.target.value }))} className="h-8 text-xs bg-white" placeholder="1.6L" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddingVehicle(false)}>Cancelar</Button>
                <Button size="sm" className="h-7 text-xs bg-primary text-white hover:bg-primary/90" onClick={addVehicle} disabled={!newVehicle.make.trim() || !newVehicle.model.trim()}>Agregar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BOTTOM: two columns ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* LEFT — Trabajos/Servicios */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-zinc-500" /> Trabajos
              </CardTitle>
              <Button size="sm" className="h-7 text-xs gap-1 bg-primary text-white hover:bg-primary/90" onClick={() => setAddingService(true)}>
                <PlusCircle className="h-3.5 w-3.5" /> Nuevo Trabajo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {/* Add service inline */}
            {addingService && (
              <div className="border border-dashed rounded-xl p-3 bg-zinc-50 space-y-2">
                <p className="text-xs font-bold text-zinc-500">Nuevo Trabajo</p>
                <Input value={newSvcName} onChange={e => setNewSvcName(e.target.value)} className="h-8 text-xs bg-white" placeholder="Afinación Menor, Cambio de Aceite…" />
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Costo M.O.</Label><Input type="number" value={newSvcLaborCost} onChange={e => setNewSvcLaborCost(parseFloat(e.target.value) || 0)} className="h-8 text-xs bg-white" /></div>
                  <div><Label className="text-[10px]">Precio M.O.</Label><Input type="number" value={newSvcLaborPrice} onChange={e => setNewSvcLaborPrice(parseFloat(e.target.value) || 0)} className="h-8 text-xs bg-white" /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddingService(false)}>Cancelar</Button>
                  <Button size="sm" className="h-7 text-xs bg-primary text-white hover:bg-primary/90" onClick={addService} disabled={!newSvcName.trim()}>Crear</Button>
                </div>
              </div>
            )}

            {!(group.services?.length) && !addingService && (
              <p className="text-xs text-muted-foreground py-3 text-center">Sin trabajos. Agrega el primero.</p>
            )}

            {/* Service cards */}
            {(group.services ?? []).map(svc => {
              const isOpen = expandedServiceId === svc.id;
              let priceResult = null;
              try { priceResult = calcServicePrice(group, svc, oils); } catch {}

              return (
                <div key={svc.id} className={cn("border rounded-xl overflow-hidden", isOpen && "shadow-md")}>
                  {/* Service header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 select-none"
                    onClick={() => setExpandedServiceId(isOpen ? null : svc.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{svc.name}</p>
                      {priceResult && (
                        <p className="text-xs text-emerald-700 font-semibold">{formatCurrency(priceResult.totalPrice)} total</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); removeService(svc.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Service detail */}
                  {isOpen && (
                    <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-zinc-50/50">
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div><Label className="text-[10px]">Costo M.O.</Label><Input type="number" value={svc.laborCost} onChange={e => updateServiceField(svc.id, "laborCost", parseFloat(e.target.value) || 0)} className="h-8 text-xs bg-white" /></div>
                        <div><Label className="text-[10px]">Precio M.O.</Label><Input type="number" value={svc.laborPrice} onChange={e => updateServiceField(svc.id, "laborPrice", parseFloat(e.target.value) || 0)} className="h-8 text-xs bg-white" /></div>
                      </div>

                      {/* Components */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold">Insumos del Trabajo</Label>
                        {svc.components.map((comp, ci) => (
                          <ComponentRow
                            key={ci}
                            comp={comp}
                            parts={group.parts ?? []}
                            oils={oils}
                            oilCapacity={group.oilCapacityLiters}
                            onChange={patch => updateComponent(svc.id, ci, patch)}
                            onRemove={() => removeComponent(svc.id, ci)}
                          />
                        ))}
                        <AddComponentRow
                          parts={group.parts ?? []}
                          oils={oils}
                          onAdd={comp => addComponent(svc.id, comp)}
                        />
                      </div>

                      {/* Price breakdown */}
                      {priceResult && priceResult.lines.length > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 space-y-1 text-xs">
                          <p className="font-bold text-emerald-800 text-[10px] uppercase tracking-wide">Desglose</p>
                          <div className="flex justify-between text-zinc-600"><span>Mano de obra</span><span>{formatCurrency(priceResult.laborPrice)}</span></div>
                          {priceResult.lines.map((l, i) => (
                            <div key={i} className="flex justify-between text-zinc-600"><span className="truncate mr-2">{l.description}</span><span>{formatCurrency(l.total)}</span></div>
                          ))}
                          <div className="flex justify-between font-bold text-emerald-900 border-t border-emerald-200 pt-1">
                            <span>Total al cliente</span><span className="text-sm">{formatCurrency(priceResult.totalPrice)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* RIGHT — Insumos */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-4 w-4 text-zinc-500" /> Insumos
                <span className="text-muted-foreground font-normal text-xs">— específicos de este vehículo</span>
              </CardTitle>
              <Button size="sm" className="h-7 text-xs gap-1 bg-primary text-white hover:bg-primary/90" onClick={() => setAddingPart(true)}>
                <PlusCircle className="h-3.5 w-3.5" /> Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {/* Add part form */}
            {addingPart && (
              <div className="border border-dashed rounded-xl p-3 bg-zinc-50 space-y-2">
                <p className="text-xs font-bold text-zinc-500">Nuevo Insumo</p>
                <div>
                  <Label className="text-[10px]">Tipo de Insumo *</Label>
                  {partTypes.length > 0 ? (
                    <Select value={newPart.typeName} onValueChange={v => {
                      const pt = partTypes.find(p => p.name === v);
                      setNewPart(p => ({ ...p, typeName: v, unit: pt?.unit ?? "pieza" }));
                    }}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Seleccionar tipo…" /></SelectTrigger>
                      <SelectContent>
                        {partTypes.map(pt => <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>)}
                        <SelectItem value="__custom__">Otro (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={newPart.typeName} onChange={e => setNewPart(p => ({ ...p, typeName: e.target.value }))} className="h-8 text-xs bg-white" placeholder="Bujía Cobre, Filtro de Aceite…" />
                  )}
                  {newPart.typeName === "__custom__" && (
                    <Input className="h-8 text-xs bg-white mt-1" placeholder="Nombre del tipo…" onChange={e => setNewPart(p => ({ ...p, typeName: e.target.value }))} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Marca *</Label><Input value={newPart.brand} onChange={e => setNewPart(p => ({ ...p, brand: e.target.value }))} className="h-8 text-xs bg-white" placeholder="NGK" /></div>
                  <div><Label className="text-[10px]">No. Parte</Label><Input value={newPart.partNumber} onChange={e => setNewPart(p => ({ ...p, partNumber: e.target.value }))} className="h-8 text-xs bg-white" placeholder="BKR6E" /></div>
                  <div><Label className="text-[10px]">SKU interno</Label><Input value={newPart.sku} onChange={e => setNewPart(p => ({ ...p, sku: e.target.value }))} className="h-8 text-xs bg-white" /></div>
                  <div>
                    <Label className="text-[10px]">Unidad</Label>
                    <Select value={newPart.unit} onValueChange={v => setNewPart(p => ({ ...p, unit: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Costo</Label><Input type="number" value={newPart.cost} onChange={e => setNewPart(p => ({ ...p, cost: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs bg-white" /></div>
                  <div><Label className="text-[10px]">Precio</Label><Input type="number" value={newPart.price} onChange={e => setNewPart(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs bg-white" /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddingPart(false)}>Cancelar</Button>
                  <Button size="sm" className="h-7 text-xs bg-primary text-white hover:bg-primary/90" onClick={addPart} disabled={!newPart.typeName.trim() || newPart.typeName === "__custom__" || !newPart.brand.trim()}>Agregar</Button>
                </div>
              </div>
            )}

            {!(group.parts?.length) && !addingPart && (
              <p className="text-xs text-muted-foreground py-3 text-center">Sin insumos. Agrega el primero.</p>
            )}

            {/* Parts table */}
            {(group.parts ?? []).length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-100 border-b">
                      <th className="text-left px-2 py-1.5 font-bold text-zinc-500">Tipo</th>
                      <th className="text-left px-2 py-1.5 font-bold text-zinc-500">Marca / No. Parte</th>
                      <th className="text-right px-2 py-1.5 font-bold text-zinc-500">Costo</th>
                      <th className="text-right px-2 py-1.5 font-bold text-zinc-500">Precio</th>
                      <th className="w-7" />
                    </tr>
                  </thead>
                  <tbody>
                    {(group.parts ?? []).map(part => (
                      <tr key={part.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                        <td className="px-2 py-1.5">
                          <p className="font-medium">{part.typeName}</p>
                          {part.sku && <p className="text-[10px] text-muted-foreground">SKU: {part.sku}</p>}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={part.brand} onChange={e => updatePartField(part.id, "brand", e.target.value)} className="h-6 text-xs bg-white border-zinc-200 mb-0.5" style={{ width: 70 }} />
                          <Input value={part.partNumber ?? ""} onChange={e => updatePartField(part.id, "partNumber", e.target.value)} className="h-6 text-xs bg-white border-zinc-200" placeholder="Parte#" style={{ width: 80 }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" value={part.cost} onChange={e => updatePartField(part.id, "cost", parseFloat(e.target.value) || 0)} className="h-6 text-xs bg-white border-zinc-200 text-right" style={{ width: 65, marginLeft: "auto" }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" value={part.price} onChange={e => updatePartField(part.id, "price", parseFloat(e.target.value) || 0)} className="h-6 text-xs bg-white border-zinc-200 text-right" style={{ width: 65, marginLeft: "auto" }} />
                        </td>
                        <td className="px-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removePart(part.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ComponentRow({ comp, parts, oils, oilCapacity, onChange, onRemove }: {
  comp: ServiceComponent;
  parts: VehiclePart[];
  oils: OilType[];
  oilCapacity: number;
  onChange: (patch: Partial<ServiceComponent>) => void;
  onRemove: () => void;
}) {
  if (comp.type === "part") {
    const part = parts.find(p => p.id === comp.partId);
    return (
      <div className="flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1.5 text-xs">
        <span className="flex-1 font-medium">{part?.typeName ?? "—"} {part?.brand ?? ""}</span>
        <Input type="number" min={1} value={comp.quantity ?? 1} onChange={e => onChange({ quantity: parseFloat(e.target.value) || 1 })} className="h-6 w-14 text-xs text-right bg-zinc-50" />
        <span className="text-zinc-400">{part?.unit ?? "pza"}</span>
        {part && <span className="text-emerald-700 font-semibold w-16 text-right">{formatCurrency((comp.quantity ?? 1) * part.price)}</span>}
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive shrink-0" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
    );
  }
  if (comp.type === "oil") {
    const oil = oils.find(o => o.id === comp.oilId);
    const qty = comp.useOilCapacity ? oilCapacity : (comp.oilQuantity ?? 1);
    return (
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-xs">
        <span className="flex-1 font-medium">{oil?.name ?? "—"} {oil?.brand ?? ""}</span>
        {comp.useOilCapacity
          ? <span className="text-amber-700 font-semibold">{oilCapacity}L</span>
          : <Input type="number" min={0.5} step={0.5} value={comp.oilQuantity ?? 1} onChange={e => onChange({ oilQuantity: parseFloat(e.target.value) || 1 })} className="h-6 w-14 text-xs text-right bg-white" />
        }
        {oil && <span className="text-emerald-700 font-semibold w-16 text-right">{formatCurrency(qty * oil.pricePerLiter)}</span>}
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive shrink-0" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
    );
  }
  return null;
}

function AddComponentRow({ parts, oils, onAdd }: { parts: VehiclePart[]; oils: OilType[]; onAdd: (c: ServiceComponent) => void }) {
  const [type, setType] = useState<"" | "part" | "oil">("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [selectedOilId, setSelectedOilId] = useState("");
  const [qty, setQty] = useState(1);
  const [useOilCap, setUseOilCap] = useState(true);

  const handleAdd = () => {
    if (type === "part" && selectedPartId) {
      const part = parts.find(p => p.id === selectedPartId);
      onAdd({ type: "part", partId: selectedPartId, partName: part?.typeName ?? "", quantity: qty });
    } else if (type === "oil" && selectedOilId) {
      const oil = oils.find(o => o.id === selectedOilId);
      onAdd({ type: "oil", oilId: selectedOilId, oilName: oil?.name ?? "", useOilCapacity: useOilCap, oilQuantity: qty });
    }
    setType(""); setSelectedPartId(""); setSelectedOilId(""); setQty(1); setUseOilCap(true);
  };

  return (
    <div className="border border-dashed rounded-lg p-2 bg-zinc-50/50 space-y-1.5">
      <div className="flex gap-1.5 items-center flex-wrap">
        <Select value={type} onValueChange={(v: any) => setType(v)}>
          <SelectTrigger className="h-7 text-xs bg-white w-32"><SelectValue placeholder="+ Insumo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="part">Refacción</SelectItem>
            <SelectItem value="oil">Aceite</SelectItem>
          </SelectContent>
        </Select>

        {type === "part" && (
          <>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger className="h-7 text-xs bg-white flex-1"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
              <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.typeName} — {p.brand}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="h-7 text-xs bg-white w-14 text-right" />
            <Button size="sm" className="h-7 text-xs bg-primary text-white hover:bg-primary/90" onClick={handleAdd} disabled={!selectedPartId}>Agregar</Button>
          </>
        )}

        {type === "oil" && (
          <>
            <Select value={selectedOilId} onValueChange={setSelectedOilId}>
              <SelectTrigger className="h-7 text-xs bg-white flex-1"><SelectValue placeholder="Aceite…" /></SelectTrigger>
              <SelectContent>{oils.map(o => <SelectItem key={o.id} value={o.id}>{o.name} {o.brand}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Switch checked={useOilCap} onCheckedChange={setUseOilCap} className="scale-75" />
              <span className="text-[10px] text-amber-700">Cap. motor</span>
            </div>
            {!useOilCap && <Input type="number" min={0.5} step={0.5} value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} className="h-7 text-xs bg-white w-14" />}
            <Button size="sm" className="h-7 text-xs bg-primary text-white hover:bg-primary/90" onClick={handleAdd} disabled={!selectedOilId}>Agregar</Button>
          </>
        )}
      </div>
    </div>
  );
}
