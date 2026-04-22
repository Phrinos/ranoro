// src/app/(app)/listadeprecios/components/parts-tab.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlusCircle, Trash2, ChevronDown, ChevronUp,
  Wrench, Package, Settings2,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { PricingGroup, PartCategory, PartVariant } from "@/types";
import { DEFAULT_PART_CATEGORIES } from "../lib/pricing-calc";

const UNITS = ["pieza", "litro", "par", "juego", "kit"];

interface Props {
  group: Partial<PricingGroup>;
  onChange: (updated: Partial<PricingGroup>) => void;
}

const emptyVariant = (): PartVariant => ({ label: "", brand: "", partNumber: "", cost: 0, price: 0 });

export function PartsTab({ group, onChange }: Props) {
  const categories = group.partCategories ?? [];
  const [expanded, setExpanded] = useState<number | null>(null);
  const [addingVariantFor, setAddingVariantFor] = useState<number | null>(null);
  const [newVariant, setNewVariant] = useState<PartVariant>(emptyVariant());
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatUnit, setNewCatUnit] = useState("pieza");

  const update = (cats: PartCategory[]) => onChange({ ...group, partCategories: cats });

  // ── Category actions ──────────────────────────────────────
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    update([...categories, { name: newCatName.trim(), unit: newCatUnit, variants: [] }]);
    setNewCatName("");
    setNewCatUnit("pieza");
    setAddingCategory(false);
  };

  const handleRemoveCategory = (idx: number) => {
    const next = categories.filter((_, i) => i !== idx);
    update(next);
    if (expanded === idx) setExpanded(null);
  };

  // ── Variant actions ───────────────────────────────────────
  const handleAddVariant = (catIdx: number) => {
    if (!newVariant.label.trim() || !newVariant.brand.trim()) return;
    const cats = categories.map((c, i) =>
      i === catIdx ? { ...c, variants: [...c.variants, { ...newVariant }] } : c
    );
    update(cats);
    setNewVariant(emptyVariant());
    setAddingVariantFor(null);
  };

  const handleRemoveVariant = (catIdx: number, varIdx: number) => {
    const cats = categories.map((c, i) =>
      i === catIdx ? { ...c, variants: c.variants.filter((_, vi) => vi !== varIdx) } : c
    );
    update(cats);
  };

  const handleVariantField = (catIdx: number, varIdx: number, field: keyof PartVariant, value: any) => {
    const cats = categories.map((c, i) =>
      i === catIdx
        ? { ...c, variants: c.variants.map((v, vi) => vi === varIdx ? { ...v, [field]: value } : v) }
        : c
    );
    update(cats);
  };

  // ── Seed defaults ─────────────────────────────────────────
  const handleSeedDefaults = () => {
    const existing = new Set(categories.map(c => c.name));
    const toAdd = DEFAULT_PART_CATEGORIES.filter(d => !existing.has(d.name));
    update([...categories, ...toAdd]);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-bold text-sm">Categorías de Refacciones</h4>
          <p className="text-xs text-muted-foreground">Cada categoría puede tener múltiples variantes.</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedDefaults} className="gap-1.5">
              <Settings2 className="h-4 w-4" /> Usar defaults
            </Button>
          )}
          <Button size="sm" className="gap-1.5 bg-black text-white hover:bg-zinc-800" onClick={() => setAddingCategory(true)}>
            <PlusCircle className="h-4 w-4" /> Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Add category form */}
      {addingCategory && (
        <Card className="border-dashed border-2 border-zinc-300">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-bold text-muted-foreground">Nueva Categoría</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs">Nombre *</Label>
                <Input placeholder="Ej: Bobina de Encendido" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unidad</Label>
                <Select value={newCatUnit} onValueChange={setNewCatUnit}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAddingCategory(false)}>Cancelar</Button>
              <Button size="sm" className="bg-black text-white hover:bg-zinc-800" onClick={handleAddCategory} disabled={!newCatName.trim()}>
                Crear Categoría
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {categories.length === 0 && !addingCategory && (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl text-muted-foreground gap-2">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">Sin categorías. Usa los defaults o crea una nueva.</p>
          </div>
        )}

        {categories.map((cat, catIdx) => {
          const isOpen = expanded === catIdx;
          const isAddingHere = addingVariantFor === catIdx;
          return (
            <Card key={catIdx} className={cn("overflow-hidden transition-shadow", isOpen && "shadow-md")}>
              {/* Category header */}
              <CardHeader
                className={cn("p-0 cursor-pointer select-none")}
                onClick={() => setExpanded(isOpen ? null : catIdx)}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isOpen ? "bg-black" : "bg-zinc-100")}>
                    <Wrench className={cn("h-4 w-4", isOpen ? "text-white" : "text-zinc-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{cat.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cat.unit}</Badge>
                      <span className="text-[11px] text-muted-foreground">{cat.variants.length} variante{cat.variants.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={e => { e.stopPropagation(); handleRemoveCategory(catIdx); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>

              {/* Variants */}
              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  {/* Variants table */}
                  {cat.variants.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-zinc-50 border-b">
                            <th className="text-left px-3 py-2 text-xs font-bold text-zinc-500">Variante</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-zinc-500">Marca / No. Parte</th>
                            <th className="text-right px-3 py-2 text-xs font-bold text-zinc-500">Costo</th>
                            <th className="text-right px-3 py-2 text-xs font-bold text-zinc-500">Precio</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {cat.variants.map((v, varIdx) => (
                            <tr key={varIdx} className="border-b last:border-0 hover:bg-zinc-50/50">
                              <td className="px-3 py-2">
                                <Input
                                  value={v.label}
                                  onChange={e => handleVariantField(catIdx, varIdx, "label", e.target.value)}
                                  className="h-7 text-xs bg-white border-zinc-200 font-medium"
                                  placeholder="Cobre"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <Input
                                    value={v.brand}
                                    onChange={e => handleVariantField(catIdx, varIdx, "brand", e.target.value)}
                                    className="h-7 text-xs bg-white border-zinc-200 w-20"
                                    placeholder="NGK"
                                  />
                                  <Input
                                    value={v.partNumber ?? ""}
                                    onChange={e => handleVariantField(catIdx, varIdx, "partNumber", e.target.value)}
                                    className="h-7 text-xs bg-white border-zinc-200 w-24"
                                    placeholder="BKR6E"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={v.cost}
                                  onChange={e => handleVariantField(catIdx, varIdx, "cost", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-white border-zinc-200 text-right w-20 ml-auto"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={v.price}
                                  onChange={e => handleVariantField(catIdx, varIdx, "price", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-white border-zinc-200 text-right w-20 ml-auto"
                                />
                              </td>
                              <td className="px-1 py-2">
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveVariant(catIdx, varIdx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add variant inline form */}
                  {isAddingHere ? (
                    <Card className="border-dashed border border-zinc-300 bg-zinc-50">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-xs font-bold text-zinc-500">Nueva Variante</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Etiqueta *</Label>
                            <Input value={newVariant.label} onChange={e => setNewVariant(v => ({ ...v, label: e.target.value }))} className="h-8 text-xs bg-white" placeholder="Cobre, Iridio, 5W-30…" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Marca *</Label>
                            <Input value={newVariant.brand} onChange={e => setNewVariant(v => ({ ...v, brand: e.target.value }))} className="h-8 text-xs bg-white" placeholder="NGK, Mobil…" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">No. de parte</Label>
                            <Input value={newVariant.partNumber} onChange={e => setNewVariant(v => ({ ...v, partNumber: e.target.value }))} className="h-8 text-xs bg-white" placeholder="BKR6E" />
                          </div>
                          <div className="space-y-1" />
                          <div className="space-y-1">
                            <Label className="text-[10px]">Costo (por {cat.unit})</Label>
                            <Input type="number" min={0} value={newVariant.cost} onChange={e => setNewVariant(v => ({ ...v, cost: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs bg-white" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Precio (por {cat.unit})</Label>
                            <Input type="number" min={0} value={newVariant.price} onChange={e => setNewVariant(v => ({ ...v, price: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs bg-white" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAddingVariantFor(null); setNewVariant(emptyVariant()); }}>Cancelar</Button>
                          <Button size="sm" className="h-7 text-xs bg-black text-white hover:bg-zinc-800" onClick={() => handleAddVariant(catIdx)} disabled={!newVariant.label.trim() || !newVariant.brand.trim()}>
                            Agregar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-dashed text-xs" onClick={() => { setAddingVariantFor(catIdx); setNewVariant(emptyVariant()); }}>
                      <PlusCircle className="h-3.5 w-3.5" /> Agregar Variante
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
