// src/app/(app)/listadeprecios/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Loader2, BookOpen, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/lib/services";
import type { PricingGroup, OilType, PartTypeCatalogEntry } from "@/types";
import { VehiclesListTab } from "./components/vehicles-list-tab";
import { GlobalPricesTab } from "./components/global-prices-tab";
import { GroupDetail } from "./components/group-detail";

type TabId = "vehiculos" | "global";

function ListaDePreciosPage() {
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────
  const [groups, setGroups] = useState<PricingGroup[]>([]);
  const [oils, setOils] = useState<OilType[]>([]);
  const [partTypes, setPartTypes] = useState<PartTypeCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Navigation ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("vehiculos");
  const [openGroup, setOpenGroup] = useState<PricingGroup | null>(null); // null = list view

  useEffect(() => {
    let loaded = 0;
    const done = () => { if (++loaded >= 3) setIsLoading(false); };

    const u1 = inventoryService.onPricingGroupsUpdate(data => { setGroups(data as PricingGroup[]); done(); });
    const u2 = inventoryService.onOilsCatalogUpdate(data => { setOils(data as OilType[]); done(); });
    const u3 = inventoryService.onPartTypesCatalogUpdate(data => { setPartTypes(data as PartTypeCatalogEntry[]); done(); });
    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Group CRUD ────────────────────────────────────────────
  const handleCreateGroup = useCallback(async (
    name: string,
    vehicles: PricingGroup["vehicles"],
    oilCapacityLiters: number
  ) => {
    const newGroup: Partial<PricingGroup> = {
      name, vehicles, oilCapacityLiters, parts: [], services: [],
    };
    try {
      const id = await inventoryService.savePricingGroup(newGroup);
      toast({ title: "Grupo creado ✓" });
      // Open the new group detail immediately
      setOpenGroup({ ...newGroup as PricingGroup, id });
    } catch (e) {
      toast({ title: "Error al crear", variant: "destructive" });
    }
  }, [toast]);

  const handleSaveGroup = useCallback(async (updated: PricingGroup) => {
    try {
      await inventoryService.savePricingGroup(updated, updated.id);
      setOpenGroup(updated);
      toast({ title: "Guardado ✓" });
    } catch (e) {
      toast({ title: "Error al guardar", variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const handleDeleteGroup = useCallback(async (id: string) => {
    try {
      await inventoryService.deletePricingGroup(id);
      toast({ title: "Grupo eliminado" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  }, [toast]);

  // ── Oils ──────────────────────────────────────────────────
  const handleSaveOils = useCallback(async (updated: OilType[]) => {
    try {
      await inventoryService.saveOilsCatalog(updated);
      toast({ title: "Aceites guardados ✓" });
    } catch {
      toast({ title: "Error al guardar aceites", variant: "destructive" });
    }
  }, [toast]);

  // ── Part types ────────────────────────────────────────────
  const handleSavePartType = useCallback(async (
    entry: Omit<PartTypeCatalogEntry, "id">,
    id?: string
  ) => {
    try {
      await inventoryService.savePartType(entry, id);
    } catch {
      toast({ title: "Error al guardar insumo", variant: "destructive" });
    }
  }, [toast]);

  const handleDeletePartType = useCallback(async (id: string) => {
    try {
      await inventoryService.deletePartType(id);
    } catch {
      toast({ title: "Error al eliminar tipo", variant: "destructive" });
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // ── Group detail view ─────────────────────────────────────
  if (openGroup) {
    // Merge with latest data from Firestore (in case it was updated)
    const latestGroup = groups.find(g => g.id === openGroup.id) ?? openGroup;
    return (
      <div className="space-y-0">
        <GroupDetail
          group={latestGroup}
          oils={oils}
          partTypes={partTypes}
          onSave={handleSaveGroup}
          onBack={() => setOpenGroup(null)}
        />
      </div>
    );
  }

  // ── Main list view ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-0.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Lista de Precios</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">Base de datos de precios por vehículo para cotizaciones automáticas vía IA.</p>
        <div className="flex items-center gap-2 mt-2 ml-12">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold border border-emerald-500/20">
            <Bot className="h-3 w-3" />
            <span>IA activa · {groups.length} grupo{groups.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
        {(["vehiculos", "global"] as TabId[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t ? "bg-red-700 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t === "vehiculos" ? "Vehículos" : "Precios Globales"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "vehiculos" && (
        <VehiclesListTab
          groups={groups}
          oils={oils}
          onOpen={setOpenGroup}
          onCreate={handleCreateGroup}
          onDelete={handleDeleteGroup}
        />
      )}

      {activeTab === "global" && (
        <GlobalPricesTab
          oils={oils}
          partTypes={partTypes}
          onSaveOils={handleSaveOils}
          onSavePartType={handleSavePartType}
          onDeletePartType={handleDeletePartType}
        />
      )}
    </div>
  );
}

export default withSuspense(ListaDePreciosPage);
