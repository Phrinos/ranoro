
"use client";

import { useParams } from 'next/navigation';
import { placeholderVehicles, placeholderServiceRecords, placeholderTechnicians } from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord, Technician } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Archive, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = parseInt(params.id as string, 10);

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined); // undefined for loading, null if not found
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [techniciansMap, setTechniciansMap] = useState<Record<string, string>>({});


  useEffect(() => {
    const foundVehicle = placeholderVehicles.find(v => v.id === vehicleId);
    setVehicle(foundVehicle || null);

    if (foundVehicle) {
      const vehicleServices = placeholderServiceRecords.filter(s => s.vehicleId === foundVehicle.id);
      setServices(vehicleServices);
    }
    
    const techMap: Record<string, string> = {};
    placeholderTechnicians.forEach(tech => {
      techMap[tech.id] = tech.name;
    });
    setTechniciansMap(techMap);

  }, [vehicleId]);


  if (vehicle === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del vehículo...</div>;
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto py-8 text-center">
         <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Vehículo no encontrado</h1>
        <p className="text-muted-foreground">No se pudo encontrar un vehículo con el ID: {vehicleId}.</p>
        <Button asChild className="mt-6">
          <Link href="/vehiculos">Volver a Vehículos</Link>
        </Button>
      </div>
    );
  }

  const getStatusVariant = (status: ServiceRecord['status']) => {
    switch (status) {
      case "Completado": return "default";
      case "En Progreso": return "secondary";
      case "Pendiente": return "outline";
      case "Cancelado": return "destructive";
      default: return "default";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={`${vehicle.licensePlate} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`}
        description={`ID Vehículo: ${vehicle.id}`}
      />

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="info">Información del Vehículo</TabsTrigger>
          <TabsTrigger value="history">Historial de Servicios</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Vehículo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Placa:</strong> {vehicle.licensePlate}</p>
                <p><strong>Marca:</strong> {vehicle.make}</p>
                <p><strong>Modelo:</strong> {vehicle.model}</p>
                <p><strong>Año:</strong> {vehicle.year}</p>
                <p><strong>VIN:</strong> {vehicle.vin || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Datos del Propietario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Nombre:</strong> {vehicle.ownerName}</p>
                <p><strong>Contacto:</strong> {vehicle.ownerContact}</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 flex justify-start">
            <Button variant="outline">
              <Archive className="mr-2 h-4 w-4" />
              Archivar Vehículo
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Servicios</CardTitle>
              <CardDescription>Servicios realizados a este vehículo.</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead className="text-right">Costo Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map(service => (
                      <TableRow key={service.id}>
                        <TableCell>{format(parseISO(service.serviceDate), "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                        <TableCell>{techniciansMap[service.technicianId] || service.technicianId}</TableCell>
                        <TableCell className="text-right">${service.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(service.status)}>{service.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay historial de servicios para este vehículo.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
