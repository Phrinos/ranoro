// src/app/(app)/pos/components/add-item-dialog.tsx

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, PackagePlus } from "lucide-react";
import type { InventoryItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem) => void;
  onNewItemRequest: (searchTerm: string) => void;
}

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function AddItemDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onNewItemRequest,
}: AddItemDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const safeInventory = useMemo(
    () => (Array.isArray(inventoryItems) ? inventoryItems.filter(Boolean) : []),
    [inventoryItems]
  );

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
          [item.name, item.sku, (item as any).brand, (item as any).category, (item as any).keywords].filter(Boolean).join(" ")
        );
        return tokens.every((t) => haystack.includes(t));
      })
      .sort((a, b) => score(b) - score(a))
      .slice(0, 100);
  }, [safeInventory, searchTerm, frequentItems]);

  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item);
    onOpenChange(false);
  };
  
  // limpia al cerrar
  const handleOpenChange = (next: boolean) => {
    if (!next) setSearchTerm("");
    onOpenChange(next);
  };

  const getPrice = (it: any) => it.sellingPrice ?? it.price ?? it.unitPrice ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Añadir Artículo/Servicio</DialogTitle>
          <DialogDescription>
            Busque un artículo en su inventario para añadirlo a la venta.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
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
                            <Button variant="link" onClick={() => onNewItemRequest(searchTerm)} className="mt-2">
                                <PackagePlus className="mr-2 h-4 w-4" />
                                Registrar Nuevo Artículo {searchTerm ? `“${searchTerm}”` : ""}
                            </Button>
                        </div>
                    </CommandEmpty>
                    <CommandGroup>
                        {!searchTerm.trim() && (
                          <li className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                            Sugeridos (más frecuentes)
                          </li>
                        )}
                        {filteredItems.map((item) => (
                           <CommandItem
                             key={item.id}
                             value={`${item.category} - ${item.name} ${item.sku ?? ''}`}
                             onSelect={() => handleSelect(item)}
                             className="flex flex-col items-start gap-1 cursor-pointer"
                           >
                              <p className="font-semibold">{item.category} - {item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku || 'N/A'} | Stock: {item.isService ? 'N/A' : item.quantity ?? 0} | Precio: {formatCurrency(getPrice(item))}
                              </p>
                           </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
