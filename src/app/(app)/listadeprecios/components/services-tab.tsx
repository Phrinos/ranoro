// src/app/(app)/listadeprecios/components/services-tab.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusCircle, Trash2, ChevronDown, ChevronUp,
  DollarSign, Wrench, Package, AlertTriangle,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { PricingGroup, ServiceTemplate, ServiceComponent } from "@/types";
import { calcServicePrice } from "../lib/pricing-calc";
import { nanoid } from "nanoid";

interface Props {
  group: Partial<PricingGroup>;
  onChange: (updated: Partial<PricingGroup>) => void;
}

const emptyService = (): ServiceTemplate => ({
  id: nanoid(8),
  name: "",
  description: "",
  laborCost: 0,
  laborPrice: 0,
  components: [],
});

const emptyComponent = (): ServiceComponent => ({
  partCategoryName: "",
  quantity: 1,
  useOilCapacity: false,
  defaultVariant: "",
});

export function ServicesTab({ group, onChange }: Props) {
  const services = group.services ?? [];
  const categories = group.partCategories ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingService, setAddingService] = useState(false);
  const [newService, setNewService] = useState<ServiceTemplate>(emptyService());
  const [newComponents, setNewComponents] = useState<ServiceComponent[]>([]);

  const update = (svcs: ServiceTemplate[]) => onChange({ ...group, services: svcs });

  // ── Service actions ───────────────────────────────────────
  const handleSaveNew = () => {
    if (!newService.name.trim()) return;
    const svc: ServiceTemplate = { ...newService, components: newComponents };
    update([...services, svc]);
    setNewService(emptyService());
    setNewComponents([]);
    setAddingService(false);
  };

  const handleDeleteService = (id: string) => {
    update(services.filter(s => s.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const handleServiceField = (id: string, field: keyof ServiceTemplate, value: any) => {
    update(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleAddComponent = (serviceId: string) => {
    update(services.map(s => s.id === serviceId ? { ...s, components: [...s.components, emptyComponent()] } : s));
  };

  const handleComponentField = (serviceId: string, compIdx: number, field: keyof ServiceComponent, value: any) => {
    update(services.map(s => {
      if (s.id !== serviceId) return s;
      const comps = s.components.map((c, i) => {
        if (i !== compIdx) return c;
        const updated = { ...c, [field]: value };
        // If switching useOilCapacity ON, set quantity to 0 (visually hidden)
        // If category changes, reset defaultVariant
        if (field === "partCategoryName") updated.defaultVariant = "";
        return updated;
      });
      return { ...s, components: comps };
    }));
  };

  const handleRemoveComponent = (serviceId: string, compIdx: number) => {
    update(services.map(s =>
      s.id === serviceId ? { ...s, components: s.components.filter((_, i) => i !== compIdx) } : s
    ));
  };

  // ── Price preview renderer ─────────────────────────────────
  const PricePreview = ({ svc }: { svc: ServiceTemplate }) => {
    const fullGroup = group as PricingGroup;
    if (!fullGroup.partCategories?.length) return null;
    try {
      const result = calcServicePrice(fullGroup, svc);
      return (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 space-y-1.5 text-xs">
          <p className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider">Vista Previa de Precio (variantes default)</p>
          <div className="space-y-0.5">
            <div className="flex justify-between text-zinc-600">
              <span>Mano de obra</span>
              <span>{formatCurrency(result.laborPrice)}</span>
            </div>
            {result.lines.map((l, i) => (
              <div key={i} className="flex justify-between text-zinc-600">
                <span className="truncate mr-2">{l.description}</span>
                <span className="shrink-0">{formatCurrency(l.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-emerald-900 border-t border-emerald-200 pt-1.5">
            <span>Total al cliente</span>
            <span className="text-base">{formatCurrency(result.totalPrice)}</span>
          </div>
        </div>
      );
    } catch {
      return null;
    }
  };

  // ── Component editor (used both for new service and existing) ─
  const ComponentEditor = ({
    components,
    onAdd,
    onChange: onCompChange,
    onRemove,
  }: {
    components: ServiceComponent[];
    onAdd: () => void;
    onChange: (idx: number, field: keyof ServiceComponent, value: any) => void;
    onRemove: (idx: number) => void;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs font-bold">Componentes (insumos del servicio)</Label>
      {components.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">Sin componentes — el precio solo considera mano de obra.</p>
      )}

      {components.map((comp, idx) => {
        const cat = categories.find(c => c.name === comp.partCategoryName);
        return (
          <div key={idx} className="rounded-lg border bg-white p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Category select */}
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px]">Categoría de Refacción</Label>
                <Select value={comp.partCategoryName} onValueChange={v => onCompChange(idx, "partCategoryName", v)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Seleccionar categoría…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name} ({c.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Default variant */}
              <div className="space-y-1">
                <Label className="text-[10px]">Variante Default</Label>
                <Select value={comp.defaultVariant} onValueChange={v => onCompChange(idx, "defaultVariant", v)} disabled={!cat?.variants.length}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Variante…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cat?.variants.map(v => (
                      <SelectItem key={v.label} value={v.label}>{v.label} — {v.brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity or oil capacity */}
              <div className="space-y-1">
                {comp.useOilCapacity ? (
                  <div className="flex flex-col h-full justify-end">
                    <Label className="text-[10px]">Cantidad</Label>
                    <div className="h-8 flex items-center text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-md px-2">
                      {group.oilCapacityLiters ?? "?"} L (capacidad motor)
                    </div>
                  </div>
                ) : (
                  <>
                    <Label className="text-[10px]">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      step={0.5}
                      value={comp.quantity}
                      onChange={e => onCompChange(idx, "quantity", parseFloat(e.target.value) || 1)}
                      className="h-8 text-xs bg-white"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Oil capacity toggle — only show for categories containing "aceite" */}
            {cat?.unit === "litro" && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={comp.useOilCapacity ?? false}
                  onCheckedChange={v => onCompChange(idx, "useOilCapacity", v)}
                  className="scale-75"
                />
                <Label className="text-[10px] text-amber-700 font-medium cursor-pointer">
                  Usar capacidad de aceite del motor ({group.oilCapacityLiters ?? "?"}L)
                </Label>
              </div>
            )}

            <Button
              variant="ghost" size="sm"
              className="w-full h-6 text-[10px] text-destructive hover:text-destructive gap-1"
              onClick={() => onRemove(idx)}
            >
              <Trash2 className="h-3 w-3" /> Quitar componente
            </Button>
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="w-full gap-1.5 border-dashed text-xs" onClick={onAdd}>
        <PlusCircle className="h-3.5 w-3.5" /> Agregar Componente
      </Button>

      {categories.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Define las refacciones en la pestaña <strong>Refacciones</strong> primero.</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-bold text-sm">Servicios y Cotizaciones</h4>
          <p className="text-xs text-muted-foreground">Recetas con insumos intercambiables. El precio se calcula automáticamente.</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-black text-white hover:bg-zinc-800" onClick={() => { setAddingService(true); setNewService(emptyService()); setNewComponents([]); }}>
          <PlusCircle className="h-4 w-4" /> Nuevo Servicio
        </Button>
      </div>

      {/* New service form */}
      {addingService && (
        <Card className="border-dashed border-2 border-zinc-300">
          <CardHeader className="pb-0 pt-4 px-4">
            <p className="font-bold text-sm">Nuevo Servicio</p>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nombre del Servicio *</Label>
              <Input value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} className="bg-white" placeholder="Afinación Menor, Cambio de Aceite…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea value={newService.description} onChange={e => setNewService(s => ({ ...s, description: e.target.value }))} className="bg-white resize-none text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Costo Mano de Obra</Label>
                <Input type="number" min={0} value={newService.laborCost} onChange={e => setNewService(s => ({ ...s, laborCost: parseFloat(e.target.value) || 0 }))} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio Mano de Obra</Label>
                <Input type="number" min={0} value={newService.laborPrice} onChange={e => setNewService(s => ({ ...s, laborPrice: parseFloat(e.target.value) || 0 }))} className="bg-white" />
              </div>
            </div>

            <ComponentEditor
              components={newComponents}
              onAdd={() => setNewComponents(c => [...c, emptyComponent()])}
              onChange={(idx, field, val) => setNewComponents(c => c.map((comp, i) => {
                if (i !== idx) return comp;
                const updated = { ...comp, [field]: val };
                if (field === "partCategoryName") updated.defaultVariant = "";
                return updated;
              }))}
              onRemove={(idx) => setNewComponents(c => c.filter((_, i) => i !== idx))}
            />

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setAddingService(false)}>Cancelar</Button>
              <Button size="sm" className="bg-black text-white hover:bg-zinc-800" onClick={handleSaveNew} disabled={!newService.name.trim()}>
                Guardar Servicio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing services */}
      {services.length === 0 && !addingService && (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl text-muted-foreground gap-2">
          <DollarSign className="h-8 w-8 opacity-30" />
          <p className="text-sm">Sin servicios cotizados aún.</p>
        </div>
      )}

      <div className="space-y-2">
        {services.map(svc => {
          const isOpen = expanded === svc.id;

          // Quick price summary for header
          let headerPrice: number | null = null;
          try {
            if ((group.partCategories?.length ?? 0) > 0) {
              headerPrice = calcServicePrice(group as PricingGroup, svc).totalPrice;
            }
          } catch { /* ignore */ }

          return (
            <Card key={svc.id} className={cn("overflow-hidden", isOpen && "shadow-md")}>
              <CardHeader className="p-0" onClick={() => setExpanded(isOpen ? null : svc.id)}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isOpen ? "bg-black" : "bg-zinc-100")}>
                    <Wrench className={cn("h-4 w-4", isOpen ? "text-white" : "text-zinc-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{svc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">{svc.components.length} componente{svc.components.length !== 1 ? "s" : ""}</span>
                      {headerPrice !== null && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] px-1.5 py-0">
                          {formatCurrency(headerPrice)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={e => { e.stopPropagation(); handleDeleteService(svc.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input value={svc.name} onChange={e => handleServiceField(svc.id, "name", e.target.value)} className="bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descripción</Label>
                    <Textarea value={svc.description ?? ""} onChange={e => handleServiceField(svc.id, "description", e.target.value)} className="bg-white resize-none text-sm" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Costo Mano de Obra</Label>
                      <Input type="number" min={0} value={svc.laborCost} onChange={e => handleServiceField(svc.id, "laborCost", parseFloat(e.target.value) || 0)} className="bg-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio Mano de Obra</Label>
                      <Input type="number" min={0} value={svc.laborPrice} onChange={e => handleServiceField(svc.id, "laborPrice", parseFloat(e.target.value) || 0)} className="bg-white" />
                    </div>
                  </div>

                  <ComponentEditor
                    components={svc.components}
                    onAdd={() => handleAddComponent(svc.id)}
                    onChange={(idx, field, val) => handleComponentField(svc.id, idx, field, val)}
                    onRemove={(idx) => handleRemoveComponent(svc.id, idx)}
                  />

                  <PricePreview svc={svc} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
