// src/components/shared/InventorySearchDialog.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackagePlus, Tags, Package, Car, Search as SearchIcon, Loader2 } from "lucide-react";
import type { InventoryItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems?: InventoryItem[];
  onItemSelected: (item: InventoryItem, quantity: number) => void;
  onNewItemRequest?: (searchTerm: string) => void;
  includeServices?: boolean;
}

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function InventorySearchDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onNewItemRequest,
  includeServices = true,
}: InventorySearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Firestore data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setSearchTerm("");

    const base = collection(db, "inventory");
    const q = includeServices ? query(base) : query(base, where("isService", "==", false));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as InventoryItem));
        console.log(`[InventorySearch] Firestore returned ${loaded.length} items`);
        setItems(loaded);
        setIsLoading(false);
      },
      (err) => {
        console.error("[InventorySearch] Firestore error:", err);
        // Fallback a props si Firestore falla
        if (inventoryItems && inventoryItems.length > 0) {
          setItems(inventoryItems);
        }
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [open, includeServices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autofocus al input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ── Scoring & Filtering ──────────────────────────────────────────────────
  const score = (it: InventoryItem) =>
    ((it as any).timesSold || (it as any).salesCount || 0) * 3 +
    ((it as any).timesUsed || (it as any).serviceUsageCount || 0) * 3 +
    ((it as any).lastSoldAt ? 2 : 0) +
    ((it.quantity ?? 0) > 0 ? 1 : 0);

  const filteredItems = useMemo(() => {
    const trimmed = searchTerm.trim();

    // Sin búsqueda → mostrar los 30 más frecuentes
    if (!trimmed) {
      return [...items].sort((a, b) => score(b) - score(a)).slice(0, 30);
    }

    // Mínimo 2 caracteres para buscar
    if (trimmed.length < 2) return [];

    const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);
    return items
      .filter((item) => {
        const haystack = normalize(
          [item.name, item.sku, (item as any).brand, item.category, (item as any).keywords]
            .filter(Boolean)
            .join(" ")
        );
        return tokens.every((t) => haystack.includes(t));
      })
      .sort((a, b) => score(b) - score(a))
      .slice(0, 100);
  }, [items, searchTerm]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item, 1);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchTerm("");
    onOpenChange(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle>Buscar en Inventario</DialogTitle>
          <DialogDescription>
            {items.length > 0
              ? `${items.length} artículos disponibles. Escribe para filtrar.`
              : "Busca por nombre, categoría o SKU."}
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="px-6 pt-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar por nombre, SKU, categoría, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="px-6 pb-2">
          <ScrollArea className="h-[50vh]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Cargando inventario...</p>
              </div>
            ) : searchTerm.trim().length > 0 && searchTerm.trim().length < 2 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <SearchIcon className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">Escribe al menos 2 caracteres...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-muted-foreground text-sm">
                  {items.length === 0
                    ? "No hay artículos en el inventario."
                    : "No se encontraron artículos que coincidan."}
                </p>
                {!!onNewItemRequest && (
                  <Button
                    variant="link"
                    onClick={() => onNewItemRequest(searchTerm)}
                    className="font-bold text-primary"
                  >
                    <PackagePlus className="mr-2 h-4 w-4" />
                    ¿Registrar como Nuevo Artículo?
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5 pr-2">
                {!searchTerm.trim() && (
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-3 py-2 bg-muted/30 rounded-md mb-1">
                    Sugerencias frecuentes
                  </p>
                )}

                {filteredItems.map((item) => {
                  const isLowStock = !item.isService && item.quantity <= (item.lowStockThreshold || 0);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex flex-col items-start gap-1.5 w-full text-left cursor-pointer border-b last:border-0 hover:bg-muted/50 active:bg-muted/70 transition-colors p-3 rounded-md"
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[9px] font-bold uppercase tracking-wider h-5"
                          >
                            {item.category || "General"}
                          </Badge>
                          <span className="font-bold text-base truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-primary text-lg">
                            {formatCurrency(item.sellingPrice ?? 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Tags className="h-3.5 w-3.5 opacity-50" />
                          <span>
                            SKU:{" "}
                            <span className="font-medium text-foreground">{item.sku || "—"}</span>
                          </span>
                        </div>

                        {!item.isService && (
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 opacity-50" />
                            <span>
                              Stock:{" "}
                              <span
                                className={cn(
                                  "font-bold",
                                  isLowStock ? "text-destructive" : "text-foreground"
                                )}
                              >
                                {item.quantity}
                              </span>
                            </span>
                          </div>
                        )}

                        {(item as any).brand && (
                          <div className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 opacity-50" />
                            <span>
                              Marca:{" "}
                              <span className="font-medium text-foreground">
                                {(item as any).brand}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
