

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ServiceRecord, Vehicle, Technician, ServiceSubStatus, ServiceTypeRecord, InventoryItem, Personnel } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isToday, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { inventoryService } from '@/lib/services/inventory.service';
import { personnelService } from '@/lib/services/personnel.service';
import { serviceService } from '@/lib/services/service.service';


type KanbanColumnId = 'Agendado' | 'En Espera de Refacciones' | 'Reparando' | 'Completado';

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
            {service.subStatus && service.status === 'En Taller' && <Badge variant="outline" className="mt-1 text-xs">{service.subStatus}</Badge>}
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
  'En Espera de Refacciones': { bg: 'bg-orange-50 dark:bg-orange-900/30', title: 'text-orange-800 dark:text-orange-200' },
  'Reparando': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', title: 'text-yellow-800 dark:text-yellow-200' },
  'Completado': { bg: 'bg-green-50 dark:bg-green-900/30', title: 'text-green-800 dark:text-green-200' },
};

export default function TableroPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onServicesUpdate(setServices),
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onPersonnelUpdate(setPersonnel),
      inventoryService.onItemsUpdate(setInventoryItems),
      inventoryService.onServiceTypesUpdate((data) => {
          setServiceTypes(data);
          setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);


  const columnOrder: KanbanColumnId[] = ['Agendado', 'En Espera de Refacciones', 'Reparando', 'Completado'];
  
  const kanbanColumns = useMemo((): KanbanColumn[] => {
    const columns: Record<KanbanColumnId, KanbanColumn> = {
      'Agendado': { id: 'Agendado', title: 'Agenda (Hoy)', services: [] },
      'En Espera de Refacciones': { id: 'En Espera de Refacciones', title: 'Espera Refacciones', services: [] },
      'Reparando': { id: 'Reparando', title: 'Reparando', services: [] },
      'Completado': { id: 'Completado', title: 'Listo para Entrega', services: [] },
    };

    services.forEach(service => {
        // Only include services scheduled for today and that have been confirmed
        if(service.status === 'Agendado' && service.appointmentStatus === 'Confirmada' && service.serviceDate && isValid(parseISO(service.serviceDate)) && isToday(parseISO(service.serviceDate))) {
            columns['Agendado'].services.push(service);
        } else if (service.status === 'En Taller') {
            switch(service.subStatus) {
                case 'En Espera de Refacciones':
                    columns['En Espera de Refacciones'].services.push(service);
                    break;
                case 'Completado':
                    columns['Completado'].services.push(service);
                    break;
                case 'Reparando':
                default:
                    columns['Reparando'].services.push(service);
                    break;
            }
        }
    });

    for (const colId in columns) {
        columns[colId as KanbanColumnId].services.sort((a, b) => {
            const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
            const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
            return dateA - dateB; 
        });
    }
    
    return columnOrder.map(id => columns[id]);
  }, [services]);

  const handleCardClick = (serviceId: string) => {
    router.push(`/servicios/${serviceId}`);
  };
  
  const handleMoveService = async (serviceId: string, direction: 'left' | 'right') => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    let currentColumnId: KanbanColumnId;
    if (service.status === 'Agendado') {
        currentColumnId = 'Agendado';
    } else {
        currentColumnId = service.subStatus as KanbanColumnId || 'Reparando';
    }
    
    const currentIndex = columnOrder.indexOf(currentColumnId);
    let newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    newIndex = Math.max(0, Math.min(columnOrder.length - 1, newIndex));
    
    if (newIndex !== currentIndex) {
        const newColumnId = columnOrder[newIndex];
        const updatedService: Partial<ServiceRecord> = {};
        
        if (newColumnId === 'Agendado') {
            updatedService.status = 'Agendado';
            updatedService.subStatus = undefined;
        } else {
            updatedService.status = 'En Taller';
            updatedService.subStatus = newColumnId as ServiceSubStatus;
            if (newColumnId === 'Completado' && !service.deliveryDateTime) {
                updatedService.deliveryDateTime = new Date().toISOString();
            }
        }
        
        await serviceService.updateService(serviceId, updatedService);
        
        toast({
            title: 'Servicio Movido',
            description: `El servicio ahora está en "${newColumnId}".`
        });
    }
  };

  if (isLoading) {
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
        actions={
          <Button asChild>
            <Link href="/servicios/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Link>
          </Button>
        }
      />
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
                        onClick={() => handleCardClick(service.id)}
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
    </>
  );
}
