
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { DashboardCharts } from '@/app/(app)/dashboard/components/DashboardCharts';
import { serviceService, saleService, inventoryService, adminService } from '@/lib/services';
import type { ServiceRecord, SaleReceipt, InventoryItem, MonthlyFixedExpense, User as Personnel } from '@/types';
import { Loader2 } from 'lucide-react';

export default function ReportesPage() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [sales, setSales] = useState<SaleReceipt[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Suscribirse a todos los flujos de datos necesarios para las gráficas
    const unsubs: (() => void)[] = [
      serviceService.onServicesUpdate(setServices),
      saleService.onSalesUpdate(setSales),
      inventoryService.onItemsUpdate(setInventory),
      inventoryService.onFixedExpensesUpdate(setFixedExpenses),
      adminService.onUsersUpdate((users) => {
        setPersonnel(users);
        setIsLoading(false); // Marcar como cargado después de que el último flujo de datos llegue
      }),
    ];

    // Limpiar las suscripciones cuando el componente se desmonte
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  return (
    <div>
      <PageHeader
        title="Reportes Financieros"
        description="Analiza el rendimiento, la rentabilidad y el volumen de operaciones de tu taller."
      />
      <main className="mt-8">
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            Cargando reportes...
          </div>
        ) : (
          <DashboardCharts
            services={services}
            sales={sales}
            inventory={inventory}
            fixedExpenses={fixedExpenses}
            personnel={personnel}
          />
        )}
      </main>
    </div>
  );
}
