"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { InventoryItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  onAddItem: (item: InventoryItem, quantity: number) => void;
  isLoading: boolean;
}

/** quita acentos y pasa a lowercase */
const normalize = (s?: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export function AddItemDialog({
  open,
  onOpenChange,
  inventory,
  onAddItem,
  isLoading,
}: AddItemDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const safeInventory = useMemo(
    () => (Array.isArray(inventory) ? inventory.filter(Boolean) : []),
    [inventory]
  );

  // score de “frecuencia” para sugerencias
  const score = (it: any) =>
    (it.timesSold || it.salesCount || 0) * 3 +
    (it.timesUsed || it.serviceUsageCount || 0) * 3 +
    (it.lastSoldAt ? 2 : 0) +
    (it.quantity > 0 ? 1 : 0);

  const frequentItems = useMemo(
    () =>
      [...safeInventory]
        .sort((a, b) => score(b) - score(a))
        .slice(0, 30),
    [safeInventory]
  );

  const itemsFromSearch = useMemo(() => {
    const q = normalize(searchTerm.trim());
    if (!q) return [] as InventoryItem[];

    const tokens = q.split(/\s+/).filter(Boolean);

    return safeInventory
      .filter((item) => {
        const haystack = normalize(
          [
            item.name,
            item.sku,
            (item as any).brand,
            (item as any).category,
            (item as any).keywords,
          ]
            .filter(Boolean)
            .join(" ")
        );
        return tokens.every((t) => haystack.includes(t));
      })
      .sort((a, b) => score(b) - score(a))
      .slice(0, 100);
  }, [safeInventory, searchTerm]);

  const itemsToShow = searchTerm.trim() ? itemsFromSearch : frequentItems;

  const handleSelect = (item: InventoryItem) => {
    onAddItem(item, 1);
    setSearchTerm("");
    onOpenChange(false);
  };

  // limpia al cerrar
  const handleOpenChange = (next: boolean) => {
    if (!next) setSearchTerm("");
    onOpenChange(next);
  };

  // precio de respaldo por si el schema varía
  const getPrice = (it: any) =>
    it.sellingPrice ?? it.price ?? it.unitPrice ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md w-full p-0 overflow-visible">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Añadir Artículo/Servicio</DialogTitle>
          <DialogDescription>
            Busque un artículo en su inventario para añadirlo a la venta.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-0 space-y-4 min-h-[350px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, SKU, marca…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <ScrollArea className="h-64 border rounded-md">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : itemsToShow.length > 0 ? (
              <ul className="p-2 space-y-1">
                {!searchTerm.trim() && (
                  <li className="px-2 pb-2 text-xs text-muted-foreground">
                    Sugeridos (más frecuentes)
                  </li>
                )}
                {itemsToShow.map((item) => (
                  <li
                    key={item.id}
                    className="p-2 hover:bg-muted cursor-pointer rounded-md"
                    onClick={() => handleSelect(item)}
                  >
                    <p className="font-semibold">
                      {item.name ?? "—"}{" "}
                      <span className="text-muted-foreground">
                        ({item.sku ?? "N/A"})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {item.isService ? "N/A" : item.quantity ?? 0} | Precio:{" "}
                      {formatCurrency(getPrice(item))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No se encontraron artículos.
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
