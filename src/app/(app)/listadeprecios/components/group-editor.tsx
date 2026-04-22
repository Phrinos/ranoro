// src/app/(app)/listadeprecios/components/group-editor.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, Car, Wrench, DollarSign, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/lib/services";
import type { PricingGroup } from "@/types";
import { generateGroupName, DEFAULT_PART_CATEGORIES } from "../lib/pricing-calc";
import { VehiclesTab } from "./vehicles-tab";
import { PartsTab } from "./parts-tab";
import { ServicesTab } from "./services-tab";

const EMPTY_GROUP = (): Partial<PricingGroup> => ({
  name: "",
  vehicles: [],
  oilCapacityLiters: 4,
  partCategories: [...DEFAULT_PART_CATEGORIES],
  services: [],
});

interface Props {
  group: PricingGroup | null; // null = new
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function GroupEditor({ group, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Partial<PricingGroup>>(EMPTY_GROUP());
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("vehicles");

  // reset draft whenever a group is (re-)opened
  useEffect(() => {
    if (open) {
      setDraft(group ? { ...group } : EMPTY_GROUP());
      setActiveTab("vehicles");
    }
  }, [open, group]);

  // Auto-update name based on vehicles whenever they change
  const handleChange = (updated: Partial<PricingGroup>) => {
    const autoName = generateGroupName({ vehicles: updated.vehicles ?? [] });
    setDraft({ ...updated, name: autoName === "Nuevo Grupo" && updated.name ? updated.name : autoName });
  };

  const handleSave = async () => {
    if (!(draft.vehicles?.length ?? 0)) {
      toast({ title: "Agrega al menos un vehículo", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await inventoryService.savePricingGroup(draft, group?.id);
      toast({ title: group ? "Grupo actualizado ✓" : "Grupo creado ✓" });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error al guardar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-6 py-5 shrink-0">
          <SheetHeader>
            <SheetTitle className="text-white text-lg font-black">
              {group ? "Editar Grupo" : "Nuevo Grupo de Vehículos"}
            </SheetTitle>
            <SheetDescription className="text-zinc-400 text-xs">
              {draft.name || "Configura los vehículos, refacciones y servicios de este grupo."}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Name override */}
        <div className="px-6 py-3 border-b bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-zinc-500 shrink-0">Nombre del grupo</Label>
            <Input
              value={draft.name ?? ""}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              className="bg-white h-8 text-sm"
              placeholder="Se genera automáticamente de los vehículos…"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 bg-zinc-100 rounded-xl shrink-0">
            <TabsTrigger value="vehicles" className="flex-1 gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <Car className="h-3.5 w-3.5" /> Vehículos
            </TabsTrigger>
            <TabsTrigger value="parts" className="flex-1 gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <Wrench className="h-3.5 w-3.5" /> Refacciones
            </TabsTrigger>
            <TabsTrigger value="services" className="flex-1 gap-1.5 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <DollarSign className="h-3.5 w-3.5" /> Servicios
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="vehicles" className="mt-0 px-6 py-4 h-full">
              <VehiclesTab group={draft} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="parts" className="mt-0 px-6 py-4 h-full">
              <PartsTab group={draft} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="services" className="mt-0 px-6 py-4 h-full">
              <ServicesTab group={draft} onChange={handleChange} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" /> Cancelar
          </Button>
          <Button
            className="bg-black hover:bg-zinc-800 text-white gap-2 px-6"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Guardando…" : "Guardar Grupo"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
