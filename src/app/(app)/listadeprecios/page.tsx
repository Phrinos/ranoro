// src/app/(app)/listadeprecios/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, BookOpen, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/lib/services";
import type { PricingGroup } from "@/types";
import { usePricingData } from "./hooks/use-pricing-data";
import { PricingGroupsTable } from "./components/pricing-groups-table";
import { GroupEditor } from "./components/group-editor";

function ListaDePreciosPage() {
  const { toast } = useToast();
  const { groups, isLoading } = usePricingData();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PricingGroup | null>(null);

  const handleNew = () => {
    setEditingGroup(null);
    setEditorOpen(true);
  };

  const handleEdit = (group: PricingGroup) => {
    setEditingGroup(group);
    setEditorOpen(true);
  };

  const handleDelete = useCallback(async (id: string) => {
    try {
      await inventoryService.deletePricingGroup(id);
      toast({ title: "Grupo eliminado" });
    } catch (e) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Lista de Precios</h1>
            </div>
            <p className="text-zinc-400 text-sm">
              Base de datos de costos por vehículo. La IA utiliza estos datos para cotizar automáticamente vía WhatsApp.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 rounded-full px-3 py-1 text-xs font-semibold border border-emerald-500/30">
                <Bot className="h-3 w-3" />
                <span>IA activa — {groups.length} grupo{groups.length !== 1 ? "s" : ""} cargado{groups.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleNew}
            className="bg-white text-zinc-900 hover:bg-zinc-100 font-bold gap-2 shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            Nuevo Grupo
          </Button>
        </div>
      </div>

      {/* Pricing groups table */}
      <PricingGroupsTable
        groups={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNew={handleNew}
      />

      {/* Group editor sheet */}
      <GroupEditor
        group={editingGroup}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={() => {}}
      />
    </div>
  );
}

export default withSuspense(ListaDePreciosPage);
