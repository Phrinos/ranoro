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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar Producto en Inventario</DialogTitle>
          <DialogDescription>
            Busca por nombre o SKU y añade productos a tu compra.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <ScrollArea className="h-72">
          {isLoading ? (
            <div className="space-y-2 pr-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="pr-4 space-y-2">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <Button 
                    key={item.id} 
                    variant="ghost" 
                    className="flex flex-col items-start w-full p-2 h-auto text-left hover:bg-muted"
                    onClick={() => handleSelect(item)}
                  >
                     <p className="font-semibold">{item.category} - {item.name}</p>
                     <p className="text-xs text-muted-foreground">
                        SKU: {item.sku || 'N/A'} | Stock: {item.quantity} | Venta: {formatCurrency(item.sellingPrice)} | Costo: {formatCurrency(item.unitPrice)}
                     </p>
                  </Button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No se encontraron productos.</p>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
