import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryTable } from "./components/inventory-table";
import { InventoryItemDialog } from "./components/inventory-item-dialog";
import { placeholderInventory } from "@/lib/placeholder-data";

export default function InventarioPage() {
  const inventoryItems = placeholderInventory;

  return (
    <>
      <PageHeader
        title="Gestión de Inventario"
        description="Administra los niveles de stock, registra compras y ventas de repuestos."
        actions={
          <InventoryItemDialog
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
