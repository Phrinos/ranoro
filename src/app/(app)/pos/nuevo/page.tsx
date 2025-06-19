
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { PosDialog } from "../components/pos-dialog";
import { placeholderInventory } from "@/lib/placeholder-data";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

export default function NuevaVentaPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const inventoryItems = placeholderInventory; 
  const [isDialogOpen, setIsDialogOpen] = useState(true); 

  useEffect(() => {
    setIsDialogOpen(true); // Ensure dialog is open when page loads
  }, []);

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) { // If the dialog is being closed
      setIsDialogOpen(false);
      router.push('/pos'); // Redirect to sales log
    } else {
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <PageHeader
        title="Registrar Nueva Venta"
        description="Complete los artículos y detalles para la nueva venta."
      />
      <PosDialog
        inventoryItems={inventoryItems}
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSaleCompleteRedirectPath="/pos"
      />
      {/* Fallback content if dialog somehow closes without redirecting, though onOpenChange should handle it */}
      {!isDialogOpen && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Redireccionando al registro de ventas...</p>
        </div>
      )}
    </>
  );
}
