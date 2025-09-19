
"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { PackagePlus } from "lucide-react";
import type { InventoryItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem, quantity: number) => void;
  onNewItemRequest?: (searchTerm: string) => void;
}

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function InventorySearchDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onNewItemRequest,
}: InventorySearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const safeInventory = useMemo(
    () => (Array.isArray(inventoryItems) ? inventoryItems.filter(Boolean) : []),
    [inventoryItems]
  );

  // ranking para “más frecuentes”
  const score = (it: any) =>
    (it.timesSold || it.salesCount || 0) * 3 +
    (it.timesUsed || it.serviceUsageCount || 0) * 3 +
    (it.lastSoldAt ? 2 : 0) +
    (it.quantity > 0 ? 1 : 0);

  const frequentItems = useMemo(
    () => [...safeInventory].sort((a, b) => score(b) - score(a)).slice(0, 30),
    [safeInventory]
  );

  const filteredItems = useMemo(() => {
    const q = normalize(searchTerm.trim());
    if (!q) return frequentItems;

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
  }, [safeInventory, searchTerm, frequentItems]);

  const getPrice = (it: any) => it.sellingPrice ?? it.price ?? it.unitPrice ?? 0;

  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item, 1);
    setSearchTerm("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setSearchTerm("");
    onOpenChange(next);
  };
  
  const handleNewItem = () => {
    if(onNewItemRequest) {
      onNewItemRequest(searchTerm);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Buscar en Inventario</DialogTitle>
          <DialogDescription>
            Busca y selecciona un producto o servicio.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Desactivamos el filtro interno y protegemos los items */}
          <Command
            shouldFilter={false}
            className={cn(
              "rounded-lg border bg-white",
              "[&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:h-12",
              "[&_[cmdk-input]]:text-sm [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3"
            )}
          >
            <CommandInput
              placeholder="Buscar por nombre, SKU, marca..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />

            <CommandList className="max-h-[52vh] overflow-y-auto">
              <CommandEmpty>
                <div className="text-center p-4">
                  <p>No se encontraron artículos.</p>
                  {onNewItemRequest && (
                    <Button variant="link" onClick={handleNewItem} className="mt-2 text-destructive">
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Registrar Nuevo Artículo
                      {searchTerm ? ` “${searchTerm}”` : ""}
                    </Button>
                  )}
                </div>
              </CommandEmpty>

              <CommandGroup>
                {!searchTerm.trim() && (
                  <li className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                    Sugeridos (más frecuentes)
                  </li>
                )}

                {filteredItems.map((item) => {
                  // Hacemos que el "value" incluya TODOS los campos buscables
                  const searchValue = [
                    item.name,
                    item.sku,
                    (item as any).brand,
                    (item as any).category,
                    (item as any).keywords,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <CommandItem
                      key={item.id}
                      value={searchValue}
                      onSelect={() => handleSelect(item)}
                      // Blindaje: aunque cmdk lo marque data-disabled, se puede clickear
                      className="flex flex-col items-start gap-1 cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                    >
                      <p className="font-semibold">
                        <span className="text-primary">{item.category || "Sin categoría"}</span>
                        {" — "}
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground space-x-2">
                        <span>SKU: <span className="font-semibold">{item.sku || "N/A"}</span></span>
                        <span>Stock: <span className="font-semibold">{item.isService ? "N/A" : item.quantity ?? 0}</span></span>
                        <span>Venta: <span className="font-semibold">{formatCurrency(getPrice(item))}</span></span>
                        <span>Costo: <span className="font-semibold">{formatCurrency(item.unitPrice ?? 0)}</span></span>
                      </p>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
