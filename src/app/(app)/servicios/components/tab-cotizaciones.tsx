
// src/app/(app)/servicios/components/tab-cotizaciones.tsx
"use client";

import React, { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TableToolbar } from '@/components/shared/table-toolbar';
import type { ServiceRecord, Vehicle, User } from '@/types';
import { useTableManager } from '@/hooks/useTableManager';
import { ServiceAppointmentCard } from './ServiceAppointmentCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { serviceService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

interface CotizacionesTabContentProps {
  services: ServiceRecord[];
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onShowPreview: (service: ServiceRecord) => void;
}

export default function CotizacionesTabContent({
  services,
  vehicles,
  personnel,
  currentUser,
  onShowPreview,
}: CotizacionesTabContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    paginatedData, 
    ...tableManager 
  } = useTableManager<ServiceRecord>({
    initialData: services,
    searchKeys: ["id", "vehicleIdentifier", "description", "serviceItems.name"],
    dateFilterKey: 'serviceDate',
    initialSortOption: "serviceDate_desc",
    itemsPerPage: 10,
  });

  const handleEditQuote = useCallback((quoteId: string) => {
    router.push(`/servicios/${quoteId}`);
  }, [router]);
  
  const handleDeleteQuote = async (quoteId: string) => {
    try {
        await serviceService.deleteService(quoteId);
        toast({ title: 'Cotización Eliminada', description: `La cotización ha sido eliminada permanentemente.` });
    } catch (e) {
        toast({ title: 'Error', description: 'No se pudo eliminar la cotización.', variant: 'destructive' });
    }
  };


  return (
    <div className="space-y-4">
      <TableToolbar
        {...tableManager}
        searchPlaceholder="Buscar por folio, placa o descripción..."
        sortOptions={[
            { value: 'serviceDate_desc', label: 'Más Reciente' },
            { value: 'serviceDate_asc', label: 'Más Antiguo' },
            { value: 'totalCost_desc', label: 'Monto (Mayor a Menor)' },
            { value: 'totalCost_asc', label: 'Monto (Menor a Mayor)' },
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
              {paginatedData.map(quote => (
                  <ServiceAppointmentCard 
                    key={quote.id}
                    service={quote}
                    vehicle={vehicles.find(v => v.id === quote.vehicleId)}
                    personnel={personnel}
                    currentUser={currentUser}
                    onEdit={() => handleEditQuote(quote.id)}
                    onView={() => onShowPreview(quote)}
                    onDelete={() => handleDeleteQuote(quote.id)}
                  />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No se encontraron cotizaciones</h3>
            <p className="text-sm">Intente cambiar su búsqueda o el rango de fechas.</p>
          </div>
        )}
    </div>
  );
}
