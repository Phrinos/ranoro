
"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  placeholderDrivers, 
  placeholderVehicles,
  persistToFirestore 
} from '@/lib/placeholder-data';
import type { Driver, Vehicle } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, User, Phone, Home, FileText, Upload, Link as LinkIcon, AlertTriangle, Car } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { DriverDialog } from '../components/driver-dialog';
import type { DriverFormValues } from '../components/driver-form';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Label } from '@/components/ui/label';

export default function DriverDetailPage() {
  const params = useParams();
  const driverId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const foundDriver = placeholderDrivers.find(d => d.id === driverId);
    setDriver(foundDriver || null);
  }, [driverId]);

  const handleSaveDriver = async (formData: DriverFormValues) => {
    if (!driver) return;
    const updatedDriver = { ...driver, ...formData };
    setDriver(updatedDriver);

    const dIndex = placeholderDrivers.findIndex(d => d.id === driverId);
    if (dIndex > -1) placeholderDrivers[dIndex] = updatedDriver;
    
    await persistToFirestore(['drivers']);
    setIsEditDialogOpen(false);
    toast({ title: "Datos Actualizados", description: `Se guardaron los cambios para ${driver.name}.` });
  };
  
  const handleAssignVehicle = async (vehicleId: string) => {
    if (!driver) return;
    const updatedDriver = { ...driver, assignedVehicleId: vehicleId };
    setDriver(updatedDriver);

    const dIndex = placeholderDrivers.findIndex(d => d.id === driverId);
    if (dIndex > -1) placeholderDrivers[dIndex].assignedVehicleId = vehicleId;
    
    await persistToFirestore(['drivers']);
    toast({ title: "Vehículo Asignado", description: "Se ha asignado el nuevo vehículo al conductor." });
  }

  const handleUploadDocument = async (docType: 'ineUrl' | 'licenseUrl' | 'proofOfAddressUrl' | 'promissoryNoteUrl') => {
    if (!driver) return;
    // In a real app, this would open a file dialog and upload to a storage service.
    // For this prototype, we'll just assign a placeholder URL.
    const placeholderUrl = "https://placehold.co/400x250.png";
    const updatedDriver = {
      ...driver,
      documents: {
        ...driver.documents,
        [docType]: placeholderUrl,
      },
    };
    setDriver(updatedDriver);

    const dIndex = placeholderDrivers.findIndex(d => d.id === driverId);
    if (dIndex > -1) placeholderDrivers[dIndex] = updatedDriver;

    await persistToFirestore(['drivers']);
    toast({ title: "Documento Simulado", description: "Se ha asignado una imagen de marcador de posición." });
  };
  
  const assignedVehicle = useMemo(() => {
    if (!driver?.assignedVehicleId) return null;
    return placeholderVehicles.find(v => v.id === driver.assignedVehicleId);
  }, [driver]);

  if (driver === undefined) {
    return <div className="container mx-auto py-8 text-center">Cargando datos del conductor...</div>;
  }

  if (!driver) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Conductor no encontrado</h1>
        <Button asChild className="mt-6"><Link href="/conductores">Volver a Conductores</Link></Button>
      </div>
    );
  }

  const fleetVehicles = placeholderVehicles.filter(v => v.isFleetVehicle);

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title={driver.name}
        description={`ID Conductor: ${driver.id}`}
        actions={<Button variant="outline" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>}
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/3">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader><CardTitle>Información del Conductor</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span>{driver.name}</span></div>
              <div className="flex items-center gap-3"><Home className="h-4 w-4 text-muted-foreground" /><span>{driver.address}</span></div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{driver.phone}</span></div>
              <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><span>Tel. Emergencia: {driver.emergencyPhone}</span></div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Vehículo Asignado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignedVehicle ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5" />
                    <p className="font-semibold">{assignedVehicle.licensePlate} - {assignedVehicle.make} {assignedVehicle.model}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/flotilla/${assignedVehicle.id}`}>Ver Vehículo</Link>
                  </Button>
                </div>
              ) : <p className="text-muted-foreground">No hay vehículo asignado.</p>}

              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <Label>Cambiar Vehículo Asignado</Label>
                  <Select onValueChange={handleAssignVehicle} defaultValue={driver.assignedVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar vehículo de la flotilla" /></SelectTrigger>
                    <SelectContent>
                      {fleetVehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.licensePlate} - {v.make} {v.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent>
              <Button disabled><FileText className="mr-2 h-4 w-4"/> Generar Contrato (Próximamente)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del Conductor</CardTitle>
              <CardDescription>Adjunte las imágenes de los documentos requeridos.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { type: 'ineUrl', label: 'INE' },
                { type: 'licenseUrl', label: 'Licencia de Conducir' },
                { type: 'proofOfAddressUrl', label: 'Comprobante de Domicilio' },
                { type: 'promissoryNoteUrl', label: 'Pagaré' },
              ].map(({ type, label }) => (
                <Card key={type}>
                  <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center border">
                      {driver.documents?.[type as keyof Driver['documents']] ? (
                        <Image src={driver.documents[type as keyof Driver['documents']]!} alt={label} width={200} height={125} className="object-contain" data-ai-hint="document photo"/>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin documento</p>
                      )}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => handleUploadDocument(type as keyof Driver['documents'])}>
                      <Upload className="mr-2 h-4 w-4"/> {driver.documents?.[type as keyof Driver['documents']] ? "Reemplazar" : "Subir Documento"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DriverDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        driver={driver}
        onSave={handleSaveDriver}
      />
    </div>
  );
}
