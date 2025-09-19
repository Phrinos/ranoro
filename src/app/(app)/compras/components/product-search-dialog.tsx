"use client";

import * as React from "react";
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
import { PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
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
  React.useEffect(() => {
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
  React.useEffect(() => {
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
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <ScrollArea className="h-72">
          {isLoading ? (
            <div className="space-y-2 pr-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="pr-4">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleSelect(item)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                    </Button>
                  </div>
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
