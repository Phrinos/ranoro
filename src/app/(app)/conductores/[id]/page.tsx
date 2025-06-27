
"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  placeholderDrivers, 
  placeholderVehicles,
  placeholderServiceRecords,
  placeholderRentalPayments,
  persistToFirestore 
} from '@/lib/placeholder-data';
import type { Driver, Vehicle, RentalPayment } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, User, Phone, Home, FileText, Upload, AlertTriangle, Car, DollarSign, Printer, ArrowLeft, Ban } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';
import { DriverDialog } from '../components/driver-dialog';
import type { DriverFormValues } from '../components/driver-form';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays, startOfToday, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { ContractContent } from '../components/contract-content';

export default function DriverDetailPage() {
  const params = useParams();
  const driverId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const contractContentRef = useRef<HTMLDivElement>(null);

  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [driverPayments, setDriverPayments] = useState<RentalPayment[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deposit, setDeposit] = useState<number | string>('');
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);

  useEffect(() => {
    const foundDriver = placeholderDrivers.find(d => d.id === driverId);
    setDriver(foundDriver || null);
    if (foundDriver?.depositAmount) {
      setDeposit(foundDriver.depositAmount);
    }
    const payments = placeholderRentalPayments.filter(p => p.driverId === driverId).sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime());
    setDriverPayments(payments);
  }, [driverId]);

  const assignedVehicle = useMemo(() => {
    if (!driver?.assignedVehicleId) return null;
    return placeholderVehicles.find(v => v.id === driver.assignedVehicleId);
  }, [driver]);
  
  const debtInfo = useMemo(() => {
    if (!driver || !driver.contractDate || !assignedVehicle?.dailyRentalCost) {
      return { debtAmount: 0, daysOwed: 0 };
    }
    const contractStartDate = parseISO(driver.contractDate);
    const today = startOfToday();
    
    if (isAfter(contractStartDate, today)) {
        return { debtAmount: 0, daysOwed: 0 };
    }

    const daysSinceContractStart = differenceInCalendarDays(today, contractStartDate) + 1;
    const totalExpectedAmount = daysSinceContractStart * assignedVehicle.dailyRentalCost;
    
    const totalPaidAmount = driverPayments.reduce((sum, p) => sum + p.amount, 0);
    const debtAmount = Math.max(0, totalExpectedAmount - totalPaidAmount);
    const daysOwed = debtAmount > 0 ? Math.floor(debtAmount / assignedVehicle.dailyRentalCost) : 0;
    
    return { debtAmount, daysOwed };

  }, [driver, assignedVehicle, driverPayments]);


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

  const handleSaveDeposit = async () => {
    if (!driver || !deposit) return;
    
    const depositAmount = Number(deposit);
    if (isNaN(depositAmount) || depositAmount < 0) {
      toast({ title: "Monto inválido", description: "Ingrese un monto de depósito válido.", variant: "destructive" });
      return;
    }

    const updatedDriver = { 
      ...driver, 
      depositAmount: depositAmount,
      contractDate: new Date().toISOString() // Set contract date when deposit is saved
    };
    setDriver(updatedDriver);

    const dIndex = placeholderDrivers.findIndex(d => d.id === driverId);
    if (dIndex > -1) {
      placeholderDrivers[dIndex] = updatedDriver;
    }
    
    await persistToFirestore(['drivers']);
    toast({ title: "Depósito Guardado", description: `Se guardó un depósito de ${formatCurrency(depositAmount)}.` });
  };

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
    <>
    <div className="container mx-auto py-8">
      <PageHeader
        title={driver.name}
        description={`ID Conductor: ${driver.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Volver</Button>
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-1/2">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Información del Conductor</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span>{driver.name}</span></div>
                <div className="flex items-center gap-3"><Home className="h-4 w-4 text-muted-foreground" /><span>{driver.address}</span></div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{driver.phone}</span></div>
                <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><span>Tel. Emergencia: {driver.emergencyPhone}</span></div>
                <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-muted-foreground" /><span>Depósito: {driver.depositAmount ? formatCurrency(driver.depositAmount) : 'N/A'}</span></div>
                <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span>Contrato: {driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'No generado'}</span></div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-1 bg-amber-50 dark:bg-amber-900/50 border-amber-200">
                <CardHeader>
                    <CardTitle className="text-lg text-amber-900 dark:text-amber-200">Estado de Cuenta</CardTitle>
                    <CardDescription className="text-amber-800 dark:text-amber-300">Resumen de la deuda actual.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">DEUDA TOTAL</p>
                        <p className="text-3xl font-bold text-destructive">{formatCurrency(debtInfo.debtAmount)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">DÍAS PENDIENTES</p>
                        <p className="text-3xl font-bold">{debtInfo.daysOwed}</p>
                    </div>
                </CardContent>
            </Card>
          </div>
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="deposit">Depósito en Garantía y Contrato</Label>
                  <div className="flex gap-2">
                      <Input
                          id="deposit"
                          type="number"
                          placeholder="Ej: 2500.00"
                          value={deposit}
                          onChange={(e) => setDeposit(e.target.value)}
                      />
                      <Button onClick={handleSaveDeposit}>Guardar Depósito y Fecha Contrato</Button>
                  </div>
              </div>
              <Button onClick={() => setIsContractDialogOpen(true)} disabled={!driver?.depositAmount}>
                <FileText className="mr-2 h-4 w-4"/> Generar Contrato
              </Button>
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

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Historial de Pagos</CardTitle></CardHeader>
            <CardContent>
              {driverPayments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Folio de Pago</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {driverPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.id}</TableCell>
                          <TableCell>{format(parseISO(payment.paymentDate), "dd MMM yyyy, HH:mm 'hrs'", { locale: es })}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No hay pagos registrados para este conductor.</p>}
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

    {assignedVehicle && (
      <PrintTicketDialog
        open={isContractDialogOpen}
        onOpenChange={setIsContractDialogOpen}
        title="Contrato de Arrendamiento"
        dialogContentClassName="printable-quote-dialog max-w-4xl"
        footerActions={
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4"/> Imprimir Contrato
          </Button>
        }
      >
        <ContractContent ref={contractContentRef} driver={driver} vehicle={assignedVehicle} />
      </PrintTicketDialog>
    )}
    </>
  );
}
