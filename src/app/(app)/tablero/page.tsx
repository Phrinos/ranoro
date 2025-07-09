
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, hydrateReady } from '@/lib/placeholder-data';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from '@/types';
import { ServiceDialog } from '../servicios/components/service-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type KanbanColumnId = 'Agendado' | 'En Espera de Refacciones' | 'Reparando' | 'Completado' | 'Entregado';

interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  services: ServiceRecord[];
}

function KanbanCard({ service, vehicle, onClick }: { service: ServiceRecord, vehicle?: Vehicle, onClick: () => void }) {
  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map(item => item.name).join(', ');
    }
    return service.description || 'Servicio sin descripción';
  };
  
  return (
    <Card className="mb-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <CardContent className="p-3">
        <p className="font-bold text-sm">{vehicle ? `${vehicle.licensePlate}` : service.vehicleIdentifier}</p>
        <p className="text-xs text-muted-foreground">{vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Vehículo no encontrado'}</p>
        <p className="text-xs font-semibold mt-2">{service.serviceType || 'Servicio General'}</p>
        <p className="text-xs text-muted-foreground truncate" title={getServiceDescriptionText(service)}>
            {getServiceDescriptionText(service)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function TableroPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [version, setVersion] = useState(0);

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const handleDatabaseUpdate = () => setVersion(v => v + 1);
    hydrateReady.then(() => {
      setServices([...placeholderServiceRecords]);
      setVehicles([...placeholderVehicles]);
      setTechnicians([...placeholderTechnicians]);
      setInventoryItems([...placeholderInventory]);
      setHydrated(true);
    });
    window.addEventListener('databaseUpdated', handleDatabaseUpdate);
    return () => window.removeEventListener('databaseUpdated', handleDatabaseUpdate);
  }, []);

  useEffect(() => {
    if (hydrated) {
      setServices([...placeholderServiceRecords]);
      setVehicles([...placeholderVehicles]);
      setTechnicians([...placeholderTechnicians]);
      setInventoryItems([...placeholderInventory]);
    }
  }, [hydrated, version]);

  const kanbanColumns = useMemo((): KanbanColumn[] => {
    const columnOrder: KanbanColumnId[] = ['Agendado', 'En Espera de Refacciones', 'Reparando', 'Completado', 'Entregado'];
    const columns: Record<KanbanColumnId, KanbanColumn> = {
      'Agendado': { id: 'Agendado', title: 'Agenda', services: [] },
      'En Espera de Refacciones': { id: 'En Espera de Refacciones', title: 'Espera Refacciones', services: [] },
      'Reparando': { id: 'Reparando', title: 'En Reparación', services: [] },
      'Completado': { id: 'Completado', title: 'Completado', services: [] },
      'Entregado': { id: 'Entregado', title: 'Entregado', services: [] },
    };

    services.forEach(service => {
      const status = service.status as KanbanColumnId;
      if (columns[status]) {
        columns[status].services.push(service);
      }
    });

    return columnOrder.map(id => columns[id]);
  }, [services]);

  const handleCardClick = (service: ServiceRecord) => {
    setEditingService(service);
    setIsServiceDialogOpen(true);
  };
  
  const handleSaveService = async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) return;
    const updatedService = data as ServiceRecord;
    
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === updatedService.id);
    if (serviceIndex > -1) {
      placeholderServiceRecords[serviceIndex] = updatedService;
    } else {
      placeholderServiceRecords.push(updatedService);
    }
    
    await persistToFirestore(['serviceRecords']);
    
    toast({
      title: "Servicio Actualizado",
      description: `El estado del servicio ${updatedService.id} ha sido actualizado.`,
    });
    setIsServiceDialogOpen(false);
  };

  if (!hydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Cargando tablero...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Tablero Kanban de Servicios"
        description="Visualiza y gestiona el flujo de trabajo de tu taller."
      />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map(column => (
          <div key={column.id} className="w-72 flex-shrink-0">
            <Card className="h-full bg-muted">
              <CardHeader className="p-4">
                <CardTitle className="text-base font-semibold flex justify-between items-center">
                  <span>{column.title}</span>
                  <Badge variant="secondary">{column.services.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 h-full">
                {column.services.map(service => (
                  <KanbanCard
                    key={service.id}
                    service={service}
                    vehicle={vehicles.find(v => v.id === service.vehicleId)}
                    onClick={() => handleCardClick(service)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
       {isServiceDialogOpen && editingService && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveService}
          mode="service"
        />
      )}
    </>
  );
}

