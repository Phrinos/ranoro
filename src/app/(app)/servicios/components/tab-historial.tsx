

"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { ServiceRecord, Vehicle, User, Payment, PaymentMethod } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import { startOfMonth, endOfMonth, subDays, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Wrench, DollarSign, TrendingUp, LineChart } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


interface HistorialTabContentProps {
  services: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  onShowPreview: (service: ServiceRecord) => void;
}

const serviceStatusOptions: { value: ServiceRecord['status'] | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'Entregado', label: 'Entregado' },
    { value: 'Cancelado', label: 'Cancelado' },
];

const paymentMethodOptions: { value: PaymentMethod | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos los Métodos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Transferencia', label: 'Transferencia' },
];

const sortOptions = [
    { value: 'deliveryDateTime_desc', label: 'Fecha (Más Reciente)' },
    { value: 'deliveryDateTime_asc', label: 'Fecha (Más Antiguo)' },
    { value: 'totalCost_desc', label: 'Costo (Mayor a Menor)' },
    { value: 'totalCost_asc', label: 'Costo (Menor a Mayor)' },
    { value: 'vehicleIdentifier_asc', label: 'Placa (A-Z)' },
];


export default function HistorialTabContent({
  services,
  vehicles,
  personnel,
  onShowPreview,
}: HistorialTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const {
    paginatedData,
    fullFilteredData,
    ...tableManager
  } = useTableManager<ServiceRecord>({
    initialData: services,
    searchKeys: ["id", "vehicleIdentifier", "description", "serviceItems.name"],
    dateFilterKey: "deliveryDateTime", // Primary date key
    initialSortOption: "deliveryDateTime_desc",
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 10,
  });

  const summaryData = useMemo(() => {
    const servicesToSummarize = fullFilteredData; // Use the full filtered data for summary
    const servicesCount = servicesToSummarize.length;
    const totalRevenue = servicesToSummarize.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const totalProfit = servicesToSummarize.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    const paymentsSummary = new Map<Payment['method'], { count: number; total: number }>();

    servicesToSummarize.forEach(service => {
        if (service.payments && service.payments.length > 0) {
            service.payments.forEach(p => {
                const current = paymentsSummary.get(p.method) || { count: 0, total: 0 };
                current.count += 1;
                current.total += p.amount || 0;
                paymentsSummary.set(p.method, current);
            });
        } else if (service.paymentMethod) { // Fallback for older records
             const current = paymentsSummary.get(service.paymentMethod as Payment['method']) || { count: 0, total: 0 };
             current.count += 1;
             current.total += service.totalCost || 0;
             paymentsSummary.set(service.paymentMethod as Payment['method'], current);
        }
    });

    return { servicesCount, totalRevenue, totalProfit, paymentsSummary };
  }, [fullFilteredData]);
  
  const handleEditService = (serviceId: string) => {
    router.push(`/servicios/${serviceId}`);
  };

  const handleCancelService = async (serviceId: string) => {
    const reason = prompt("Motivo de la cancelación:");
    if (reason) {
        try {
            await serviceService.cancelService(serviceId, reason);
            toast({ title: 'Servicio Cancelado' });
        } catch(e) {
            toast({ title: 'Error', description: 'No se pudo cancelar el servicio.', variant: 'destructive'});
        }
    }
  };

  const renderServiceCard = useCallback((record: ServiceRecord) => (
    <ServiceAppointmentCard 
      key={record.id}
      service={record}
      vehicle={vehicles.find(v => v.id === record.vehicleId)}
      personnel={personnel}
      onEdit={() => handleEditService(record.id)}
      onView={() => onShowPreview(record)}
      onCancel={() => handleCancelService(record.id)}
    />
  ), [vehicles, personnel, onShowPreview, router, handleCancelService]);


  return (
    <div className="space-y-4">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servicios en Periodo</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.servicesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales (Periodo)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Ganancia: {formatCurrency(summaryData.totalProfit)}</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
             <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ingresos por Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
                {Array.from(summaryData.paymentsSummary.entries()).length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {Array.from(summaryData.paymentsSummary.entries()).map(([method, data]) => (
                        <Badge key={method} variant="secondary" className="text-sm">
                            {method}:<span className="font-semibold ml-1">{formatCurrency(data.total)}</span>
                        </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay pagos registrados en este periodo.</p>
                )}
            </CardContent>
          </Card>
        </div>
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por folio, placa..."
        sortOptions={sortOptions}
        filterOptions={[
          {
            value: 'status',
            label: 'Estado',
            options: serviceStatusOptions,
          },
          {
            value: 'paymentMethod',
            label: 'Método de Pago',
            options: paymentMethodOptions,
          },
        ]}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tableManager.paginationSummary}</p>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {paginatedData.length > 0 ? (
        <div className="space-y-4">
          {paginatedData.map(renderServiceCard)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mb-2" />
          <h3 className="text-lg font-semibold text-foreground">No se encontraron registros</h3>
          <p className="text-sm">Intente cambiar su búsqueda o el rango de fechas.</p>
        </div>
      )}
    </div>
  );
}
