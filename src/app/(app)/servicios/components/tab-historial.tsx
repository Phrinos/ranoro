

"use client";

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { ServiceRecord, Vehicle, User, PaymentMethod } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import { startOfMonth, endOfMonth, subDays, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';


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


export default function HistorialTabContent({
  services,
  vehicles,
  personnel,
  onShowPreview,
}: HistorialTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const getRelevantDate = (service: ServiceRecord): Date | null => {
      return parseDate(service.deliveryDateTime) || parseDate(service.serviceDate);
  };
  
  const {
    filteredData,
    ...tableManager
  } = useTableManager<ServiceRecord>({
    initialData: services,
    searchKeys: ["id", "vehicleIdentifier", "description", "serviceItems.name"],
    dateFilterKey: "deliveryDateTime", // Primary date key
    initialSortOption: "deliveryDateTime_desc",
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 10,
  });
  
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
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por folio, placa..."
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
      {filteredData.length > 0 ? (
        <div className="space-y-4">
          {filteredData.map(renderServiceCard)}
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
