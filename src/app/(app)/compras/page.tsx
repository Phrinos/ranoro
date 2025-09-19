"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { NewPurchaseDialog } from "./components/new-purchase-dialog";
import { useState } from "react";
import { PurchasesTable } from "./components/purchases-table";

export default function ComprasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <div>
      <PageHeader
        title="Compras a Proveedores"
        description="Registra y administra las compras de insumos y refacciones para tu taller."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Nueva Compra
          </Button>
        }
      />

      {/* El diálogo para crear una nueva compra */}
      <NewPurchaseDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Historial de Compras</h2>
        {/* Tabla de compras integrada */}
        <PurchasesTable />
      </section>
    </div>
  );
}
