// src/app/(app)/punto-de-venta/components/inventory-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Search, PlusCircle, Package, Wrench, AlertTriangle,
  ChevronLeft, ChevronRight, PackageX, Edit,
} from "lucide-react";
import { db } from "@/lib/firebaseClient";
import {
  doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { PosInventoryItem, PosCategory } from "../hooks/use-pos-data";
import { ItemDialog, type ItemFormValues } from "./dialogs/item-dialog";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 25;

interface Props {
  items: PosInventoryItem[];
  categories: PosCategory[];
  suppliers?: import("@/types").Supplier[];
}

type QuickFilter = "all" | "product" | "service" | "low_stock" | "out_of_stock";

export function InventoryTab({ items, categories, suppliers = [] }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<PosInventoryItem> | null>(null);
  const [page, setPage] = useState(1);

  // ── Filtered + Paginated ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = search.trim().toLowerCase();
      if (q && !`${item.name} ${item.sku ?? ""} ${item.brand ?? ""}`.toLowerCase().includes(q)) return false;
      if (quickFilter === "product" && item.isService) return false;
      if (quickFilter === "service" && !item.isService) return false;
      if (quickFilter === "low_stock" && (item.isService || item.stock === 0 || item.stock > item.lowStockThreshold)) return false;
      if (quickFilter === "out_of_stock" && (item.isService || item.stock !== 0)) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [items, search, quickFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (values: ItemFormValues, id?: string) => {
    try {
      const data = {
        ...values,
        stock: values.isService ? 0 : values.stock,
        updatedAt: serverTimestamp(),
      };
      if (id) {
        await updateDoc(doc(db, "inventoryItems", id), data);
        toast({ title: "Producto actualizado" });
      } else {
        await addDoc(collection(db, "inventoryItems"), { ...data, createdAt: serverTimestamp() });
        toast({ title: "Producto creado" });
      }
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, [toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "inventoryItems", id));
      toast({ title: "Eliminado correctamente" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  }, [toast]);

  const openNew = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: PosInventoryItem) => { setEditItem(item); setDialogOpen(true); };

  const quickFilters: { value: QuickFilter; label: string }[] = [
    { value: "all", label: "Todo" },
    { value: "product", label: "Productos" },
    { value: "service", label: "Servicios" },
    { value: "low_stock", label: "Stock Bajo" },
    { value: "out_of_stock", label: "Sin Stock" },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Top bar — single row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search — wide */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nombre, SKU, marca…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>

          {/* Category select */}
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick filters — same height as search */}
          <div className="flex gap-1">
            {quickFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setQuickFilter(f.value); resetPage(); }}
                className={cn(
                  "h-10 px-3 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap",
                  quickFilter === f.value
                    ? "bg-red-700 text-white border-red-700"
                    : "bg-white text-muted-foreground border-slate-200 hover:border-slate-400"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>

          {/* Add button — right */}
          <Button onClick={openNew} className="ml-auto h-10">
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Ítem
          </Button>
        </div>

        {/* Table — desktop */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Ítem</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length > 0 ? paged.map((item) => {
                      const isLow = !item.isService && item.stock > 0 && item.stock <= item.lowStockThreshold;
                      const isOut = !item.isService && item.stock === 0;
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => openEdit(item)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded-lg", item.isService ? "bg-purple-100" : "bg-blue-100")}>
                                {item.isService ? <Wrench className="h-3.5 w-3.5 text-purple-600" /> : <Package className="h-3.5 w-3.5 text-blue-600" />}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                {item.sku && <p className="text-[11px] text-muted-foreground font-mono">{item.sku}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px]">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.isService ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <span className={cn("font-bold text-sm", isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-foreground")}>
                                {isOut && <PackageX className="inline h-3.5 w-3.5 mr-1" />}
                                {isLow && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                                {item.stock} {item.unitType ?? ""}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(item.costPrice)}</TableCell>
                          <TableCell className="text-right font-bold text-sm">{formatCurrency(item.salePrice)}</TableCell>
                          <TableCell className="text-right">
                            {item.isService ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <span className="text-sm font-semibold text-emerald-700">
                                {formatCurrency(item.stock * item.costPrice)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          No se encontraron ítems.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards — mobile */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {paged.length > 0 ? paged.map((item) => {
            const isLow = !item.isService && item.stock > 0 && item.stock <= item.lowStockThreshold;
            const isOut = !item.isService && item.stock === 0;
            return (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(item)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={cn("p-2 rounded-xl shrink-0", item.isService ? "bg-purple-100" : "bg-blue-100")}>
                        {item.isService ? <Wrench className="h-4 w-4 text-purple-600" /> : <Package className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        {item.sku && <p className="text-[11px] text-muted-foreground font-mono">{item.sku}</p>}
                        <Badge variant="outline" className="text-[10px] mt-1">{item.category}</Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm">{formatCurrency(item.salePrice)}</p>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(item.costPrice)} costo</p>
                      {!item.isService && (
                        <p className={cn("text-xs font-bold mt-1", isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-muted-foreground")}>
                          {isOut ? "Sin stock" : isLow ? `⚠ ${item.stock}` : `${item.stock} ${item.unitType ?? ""}`}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <div className="text-center text-muted-foreground py-12">
              No se encontraron ítems.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        categories={categories}
        suppliers={suppliers}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
