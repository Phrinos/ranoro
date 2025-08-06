
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { TableToolbar } from '@/components/shared/table-toolbar';
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { SaleReceipt, InventoryItem, Payment, User, InventoryCategory, Supplier } from "@/types";
import Link from "next/link";
import { useTableManager } from '@/hooks/useTableManager';
import { SaleCard } from './SaleCard';
import { Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ViewSaleDialog } from './view-sale-dialog';
import { saleService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

const sortOptions = [
    { value: 'date_desc', label: 'Más Reciente' },
    { value: 'date_asc', label: 'Más Antiguo' },
];

const paymentMethodOptions: { value: Payment['method'] | 'all', label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Tarjeta MSI', label: 'Tarjeta MSI' },
    { value: 'Transferencia', label: 'Transferencia' },
];


interface VentasPosContentProps {
  allSales: SaleReceipt[];
  allInventory: InventoryItem[];
  allUsers: User[];
  allCategories: InventoryCategory[];
  allSuppliers: Supplier[];
  currentUser: User | null;
  onReprintTicket: (sale: SaleReceipt) => void;
}


export function VentasPosContent({ 
  allSales, 
  allInventory, 
  allUsers, 
  currentUser,
  allCategories,
  allSuppliers,
  onReprintTicket,
}: VentasPosContentProps) {
  const { toast } = useToast();
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null);

  const { 
    filteredData: filteredAndSortedSales,
    ...tableManager 
  } = useTableManager<SaleReceipt>({
    initialData: allSales,
    searchKeys: ['id', 'customerName', 'items.itemName', 'payments.method'],
    dateFilterKey: 'saleDate',
    initialSortOption: 'date_desc',
    itemsPerPage: 10,
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  });
  
  const handleCancelSale = useCallback(async (saleId: string, reason: string) => {
    try {
        await saleService.cancelSale(saleId, reason, currentUser);
        toast({ title: 'Venta Cancelada', description: 'El stock ha sido restaurado.' });
        setIsViewDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: "No se pudo cancelar la venta.", variant: "destructive"});
    }
  }, [currentUser, toast]);
  
  const handleDeleteSale = useCallback(async (saleId: string) => {
    try {
        await saleService.deleteSale(saleId, currentUser);
        toast({ title: 'Venta Eliminada', description: 'La venta se ha eliminado permanentemente.' });
        setIsViewDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: "No se pudo eliminar la venta.", variant: "destructive"});
    }
  }, [currentUser, toast]);

  const handleUpdatePaymentDetails = useCallback(async (saleId: string, paymentDetails: any) => {
    await saleService.updateSale(saleId, paymentDetails);
    toast({ title: "Detalles de Pago Actualizados" });
  }, [toast]);

  return (
    <div className="space-y-4">
        <Button asChild className="w-full">
            <Link href="/pos/nuevo"><PlusCircle className="mr-2 h-4 w-4" />Nueva Venta</Link>
        </Button>
        
        <TableToolbar
            onFilterChange={tableManager.setOtherFilters}
            onSearchTermChange={tableManager.setSearchTerm}
            onSortOptionChange={tableManager.setSortOption}
            onDateRangeChange={tableManager.setDateRange}
            sortOptions={sortOptions}
            filterOptions={[{ value: 'payments.method', label: 'Método de Pago', options: paymentMethodOptions }]}
            searchPlaceholder="Buscar por ID, cliente, artículo..."
            {...tableManager}
        />

        <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
            <div className="flex items-center space-x-2">
                <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
        
        {filteredAndSortedSales.length > 0 ? (
          <div className="space-y-4">
              {filteredAndSortedSales.map(sale => {
                  return (
                      <SaleCard
                          key={sale.id}
                          sale={sale}
                          inventoryItems={allInventory}
                          users={allUsers}
                          currentUser={currentUser}
                          onReprintTicket={() => onReprintTicket(sale)}
                          onViewSale={() => { setSelectedSale(sale); setIsViewDialogOpen(true); }}
                      />
                  );
              })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Receipt className="h-12 w-12 mb-2" />
              <h3 className="text-lg font-semibold text-foreground">No se encontraron ventas</h3>
              <p className="text-sm">Intente cambiar su búsqueda o el rango de fechas.</p>
          </div>
        )}
        
        {selectedSale && <ViewSaleDialog
            open={isViewDialogOpen} 
            onOpenChange={setIsViewDialogOpen} 
            sale={selectedSale} 
            inventory={allInventory}
            users={allUsers}
            categories={allCategories}
            suppliers={allSuppliers}
            onCancelSale={handleCancelSale}
            onDeleteSale={handleDeleteSale}
            onPaymentUpdate={handleUpdatePaymentDetails}
        />}
    </div>
  );
}
