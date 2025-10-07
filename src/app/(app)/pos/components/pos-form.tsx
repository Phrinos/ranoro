// src/app/(app)/pos/components/pos-form.tsx

"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import type { InventoryItem, SaleReceipt, InventoryCategory, Supplier } from "@/types";
import { useState, useCallback, useEffect } from "react";
import { SaleSummary } from './sale-summary';
import { PosItemsTable } from "./pos-items-table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";


interface POSFormProps {
  inventoryItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: Supplier[];
  onSaleComplete: (saleData: any) => void;
  onInventoryItemCreated?: (formData: InventoryItemFormValues) => Promise<InventoryItem>;
  initialData?: SaleReceipt | null;
  onOpenValidateDialog: (index: number) => void;
  onOpenAddItemDialog: () => void;
  validatedFolios: Record<number, boolean>;
}

const COMMISSION_ITEM_ID = 'COMMISSION_FEE';

export function PosForm({ 
  inventoryItems, 
  categories, 
  suppliers, 
  onSaleComplete, 
  onInventoryItemCreated,
  initialData,
  onOpenValidateDialog,
  onOpenAddItemDialog,
  validatedFolios,
}: POSFormProps) {
  const methods = useFormContext();
  const { control, getValues, setValue, reset } = methods;
  
  useEffect(() => {
    if (initialData?.id) {
      reset(initialData);
    }
    // sólo cuando cambia el ID de la venta
  }, [initialData?.id, reset]);

  return (
    <>
      <form id="pos-form" onSubmit={methods.handleSubmit(onSaleComplete)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Columna Izquierda: Lista de Artículos */}
          <div className="lg:col-span-3">
             <section className="space-y-3">
                <h2 className="text-2xl font-bold">Artículos</h2>

                <PosItemsTable />

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={onOpenAddItemDialog} className="bg-white hover:bg-gray-100">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Artículo/Servicio
                  </Button>
                </div>
              </section>
          </div>

          {/* Columna Derecha: Pago y Resumen */}
          <div className="lg:col-span-2 space-y-6">
            <SaleSummary onOpenValidateDialog={onOpenValidateDialog} validatedFolios={validatedFolios} />
          </div>
        </div>
      </form>
    </>
  );
}
