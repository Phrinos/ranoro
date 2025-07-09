
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, persistToFirestore, hydrateReady } from '@/lib/placeholder-data';
import type { ServiceRecord, Vehicle, Technician, InventoryItem, QuoteRecord } from '@/types';
import { ServiceDialog } from '../servicios/components/service-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isToday, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';


type KanbanColumnId = 'Agendado' | 'Reparando' | 'Completado';

interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  services: ServiceRecord[];
}

function KanbanCard({ 
  service, 
  vehicle, 
  onClick, 
  onMove, 
  isFirst, 
  isLast 
}: { 
  service: ServiceRecord, 
  vehicle?: Vehicle, 
  onClick: () => void, 
  onMove: (direction: 'left' | 'right') => void, 
  isFirst: boolean, 
  isLast: boolean 
}) {
  const getServiceDescriptionText = (service: ServiceRecord) => {
    if (service.serviceItems && service.serviceItems.length > 0) {
      return service.serviceItems.map(item => item.name).join(', ');
    }
    return service.description || 'Servicio sin descripción';
  };
  
  return (
    <Card className="mb-4 group shadow-sm hover:shadow-md transition-shadow bg-card">
      <CardContent className="p-3 relative">
        <div className="absolute top-1 right-1 flex">
           <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onClick}
              title="Ver/Editar Servicio"
            >
              <Eye className="h-4 w-4" />
            </Button>
        </div>
        <div className="pr-8">
            <p className="font-bold text-sm">{vehicle ? `${vehicle.licensePlate}` : service.vehicleIdentifier}</p>
            <p className="text-xs text-muted-foreground">{vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Vehículo no encontrado'}</p>
            <p className="text-xs font-semibold mt-2">{service.serviceType || 'Servicio General'}</p>
            <p className="text-xs text-muted-foreground truncate" title={getServiceDescriptionText(service)}>
                {getServiceDescriptionText(service)}
            </p>
        </div>
        <div className="flex justify-between items-center mt-2 border-t pt-2">
            <Button variant="outline" size="icon" className="h-6 w-6" disabled={isFirst} onClick={() => onMove('left')}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-6 w-6" disabled={isLast} onClick={() => onMove('right')}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const columnStyles: Record<KanbanColumnId, { bg: string; title: string }> = {
  'Agendado': { bg: 'bg-blue-50 dark:bg-blue-900/30', title: 'text-blue-800 dark:text-blue-200' },
  'Reparando': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', title: 'text-yellow-800 dark:text-yellow-200' },
  'Completado': { bg: 'bg-green-50 dark:bg-green-900/30', title: 'text-green-800 dark:text-green-200' },
};

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

  const columnOrder: KanbanColumnId[] = ['Agendado', 'Reparando', 'Completado'];
  
  const kanbanColumns = useMemo((): KanbanColumn[] => {
    const columns: Record<KanbanColumnId, KanbanColumn> = {
      'Agendado': { id: 'Agendado', title: 'Agenda', services: [] },
      'Reparando': { id: 'Reparando', title: 'En Reparación', services: [] },
      'Completado': { id: 'Completado', title: 'Completado (Hoy)', services: [] },
    };

    services.forEach(service => {
      const status = service.status as KanbanColumnId;
      if (columns[status]) {
        // Special filter for "Completado" column to only show today's
        if (status === 'Completado') {
          const deliveryDate = service.deliveryDateTime ? parseISO(service.deliveryDateTime) : null;
          if (deliveryDate && isValid(deliveryDate) && isToday(deliveryDate)) {
            columns[status].services.push(service);
          }
        } else {
          columns[status].services.push(service);
        }
      }
    });

    for (const colId in columns) {
        columns[colId as KanbanColumnId].services.sort((a, b) => {
            const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
            const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
            return dateA - dateB; // Oldest first
        });
    }
    
    return columnOrder.map(id => columns[id]);
  }, [services]);

  const handleCardClick = (service: ServiceRecord) => {
    setEditingService(service);
    setIsServiceDialogOpen(true);
  };
  
  const handleMoveService = async (serviceId: string, direction: 'left' | 'right') => {
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) return;

    const currentStatus = placeholderServiceRecords[serviceIndex].status as KanbanColumnId;
    const currentIndex = columnOrder.indexOf(currentStatus);
    
    let newIndex;
    if (direction === 'left') {
        newIndex = Math.max(0, currentIndex - 1);
    } else {
        newIndex = Math.min(columnOrder.length - 1, currentIndex + 1);
    }

    if (newIndex !== currentIndex) {
        const newStatus = columnOrder[newIndex];
        
        // Optimistic UI update
        const updatedServices = services.map(s => 
          s.id === serviceId ? { ...s, status: newStatus } : s
        );
        setServices(updatedServices);

        // Update master data and persist
        placeholderServiceRecords[serviceIndex].status = newStatus;
        if(newStatus === 'Completado') {
            placeholderServiceRecords[serviceIndex].deliveryDateTime = new Date().toISOString();
        }
        await persistToFirestore(['serviceRecords']);
        
        toast({
            title: 'Servicio Movido',
            description: `El servicio ahora está en "${newStatus}".`
        });
    }
  };

  const handleSaveService = async (data: ServiceRecord) => {
    const serviceIndex = placeholderServiceRecords.findIndex(s => s.id === data.id);
    if (serviceIndex > -1) {
      placeholderServiceRecords[serviceIndex] = data;
    } else {
      placeholderServiceRecords.push(data);
    }
    
    await persistToFirestore(['serviceRecords']);
    
    toast({
      title: "Servicio Actualizado",
      description: `El estado del servicio ${data.id} ha sido actualizado.`,
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
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tablero Kanban de Servicios</h1>
        <p className="text-primary-foreground/80 mt-1">Visualiza y gestiona el flujo de trabajo de tu taller.</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column, colIndex) => {
            const columnStyle = columnStyles[column.id];
            return (
              <div key={column.id} className="w-72 flex-shrink-0">
                <Card className={cn("h-full min-h-[40rem]", columnStyle.bg)}>
                  <CardHeader>
                    <CardTitle className={cn("text-base font-semibold flex justify-between items-center", columnStyle.title)}>
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
                        onMove={(direction) => handleMoveService(service.id, direction)}
                        isFirst={colIndex === 0}
                        isLast={colIndex === columnOrder.length - 1}
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>
            )
        })}
      </div>
       {isServiceDialogOpen && editingService && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={editingService}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveService as (data: ServiceRecord | QuoteRecord) => Promise<void>}
          mode="service"
        />
      )}
    </>
  );
}
