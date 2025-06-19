
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryTable } from "./components/inventory-table";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import { placeholderInventory } from "@/lib/placeholder-data";
import type { InventoryItem } from "@/types";
import { useState } from "react";
import type { InventoryItemFormValues } from "./components/inventory-item-form";
import { useToast } from "@/hooks/use-toast";

export default function InventarioPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);
  const { toast } = useToast();

  const handleSaveItem = async (data: InventoryItemFormValues) => {
    const newItem: InventoryItem = {
      id: `P${String(inventoryItems.length + 1).padStart(3, '0')}`, // Simple ID generation
      ...data,
      unitPrice: Number(data.unitPrice),
      sellingPrice: Number(data.sellingPrice),
      quantity: Number(data.quantity),
      lowStockThreshold: Number(data.lowStockThreshold),
    };
    setInventoryItems(prev => [...prev, newItem]);
    placeholderInventory.push(newItem); // Also update placeholder for other views if needed
    toast({
      title: "Artículo Creado",
      description: `El artículo ${newItem.name} ha sido agregado al inventario.`,
    });
  };

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Administra los niveles de stock, registra compras y ventas de repuestos."
        actions={
          <InventoryItemDialog
            onSave={handleSaveItem}
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Artículo
              </Button>
            }
          />
        }
      />
      <InventoryTable items={inventoryItems} />
    </>
  );
}
