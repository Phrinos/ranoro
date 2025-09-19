"use client";

import React, { useMemo } from "react";
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
import { formatCurrency } from "@/lib/utils";

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems?: InventoryItem[];
  onItemSelected: (item: InventoryItem, quantity: number) => void;
  onNewItemRequest?: (searchTerm: string) => void;
}

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const score = (it: any) =>
  (it.timesSold || it.salesCount || 0) * 3 +
  (it.timesUsed || it.serviceUsageCount || 0) * 3 +
  (it.lastSoldAt ? 2 : 0) +
  ((it.quantity ?? 0) > 0 ? 1 : 0);

export function InventorySearchDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onNewItemRequest,
}: InventorySearchDialogProps) {

  const safeInventory = useMemo(
    () => (Array.isArray(inventoryItems) ? inventoryItems.filter(Boolean) : []),
    [inventoryItems]
  );
  
  const sortedInventory = useMemo(() => {
    return [...safeInventory].sort((a, b) => score(b) - score(a));
  }, [safeInventory]);
  
  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item, 1);
    onOpenChange(false);
  };
  
  const handleNewItem = (currentValue: string) => {
    if (onNewItemRequest) {
      onNewItemRequest(currentValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Buscar en Inventario</DialogTitle>
          <DialogDescription>
            Busca y selecciona un producto o servicio.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Command
            className="rounded-lg border bg-white"
          >
            <CommandInput
              placeholder="Buscar por nombre, SKU, marca..."
            />

            <CommandList className="max-h-[52vh] overflow-y-auto">
              <CommandEmpty>
                <div className="text-center p-4">
                  <p>No se encontraron artículos.</p>
                  {!!onNewItemRequest && (
                    <Button
                      variant="link"
                      onClick={() => handleNewItem("")} // Pass current search term if needed
                      className="mt-2"
                    >
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Registrar Nuevo Artículo
                    </Button>
                  )}
                </div>
              </CommandEmpty>

             <CommandGroup>
                {sortedInventory.map((item) => {
                  const searchValue = [
                    item.id,
                    item.name,
                    item.sku,
                    (item as any).brand,
                    item.category,
                    (item as any).keywords,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <CommandItem
                      key={item.id}
                      value={searchValue}
                      onSelect={() => handleSelect(item)}
                      className="flex flex-col items-start gap-1 cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                    >
                      <p className="font-semibold">{item.category} - {item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku || 'N/A'} | Stock: {item.isService ? "N/A" : item.quantity ?? 0} | Venta: {formatCurrency(item.sellingPrice)}
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