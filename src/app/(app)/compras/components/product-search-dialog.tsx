
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { collection, onSnapshot, query, where, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";


export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  sellingPrice: number;
  quantity: number;
  category: string;
  isService: boolean;
  [key: string]: any;
}

interface ProductSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProductSelect: (product: InventoryItem) => void;
}

export function ProductSearchDialog({ isOpen, onOpenChange, onProductSelect }: ProductSearchDialogProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Efecto para cargar los productos del inventario
  useEffect(() => {
    // Escuchamos solo productos que no son servicios
    const q = query(collection(db, "inventoryItems"), where("isService", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(items);
      setFilteredInventory(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching inventory:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Efecto para filtrar el inventario cuando el término de búsqueda cambia
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = inventory.filter(item =>
      item.name.toLowerCase().includes(lowercasedFilter) ||
      (item.sku && item.sku.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredInventory(filtered);
  }, [searchTerm, inventory]);

  const handleSelect = (product: InventoryItem) => {
    onProductSelect(product);
    onOpenChange(false); // Cierra el diálogo después de seleccionar
    setSearchTerm(""); // Resetea la búsqueda
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Buscar Producto en Inventario</DialogTitle>
          <DialogDescription>
            Busca por nombre o SKU y añade productos a tu compra.
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
                    {isLoading ? (
                        <div className="p-4 text-center">Cargando...</div>
                    ) : filteredInventory.length === 0 ? (
                        <CommandEmpty>
                            <div className="text-center p-4">No se encontraron productos.</div>
                        </CommandEmpty>
                    ) : (
                       <CommandGroup>
                         {filteredInventory.map((item) => {
                            const searchValue = [item.name, item.sku, (item as any).brand, (item as any).category].filter(Boolean).join(" ");
                            return (
                                <CommandItem
                                key={item.id}
                                value={searchValue}
                                onSelect={() => handleSelect(item)}
                                className="flex flex-col items-start gap-1 cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                >
                                <p className="font-semibold">{item.category} - {item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    SKU: {item.sku || 'N/A'} | Stock: {item.quantity} | Venta: {formatCurrency(item.sellingPrice)} | Costo: {formatCurrency(item.unitPrice)}
                                </p>
                                </CommandItem>
                            );
                         })}
                       </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}

