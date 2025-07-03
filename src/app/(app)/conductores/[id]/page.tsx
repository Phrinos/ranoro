
"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  placeholderDrivers, 
  placeholderVehicles,
  placeholderRentalPayments,
  persistToFirestore 
} from '@/lib/placeholder-data';
import type { Driver, RentalPayment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, User, Phone, Home, FileText, Upload, AlertTriangle, Car, DollarSign, Printer, ArrowLeft, PlusCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';
import { DriverDialog } from '../components/driver-dialog';
import type { DriverFormValues } from '../components/driver-form';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { formatCurrency, optimizeImage } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays, startOfToday, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { ContractContent } from '../components/contract-content';
import Image from "next/legacy/image";
import { RegisterPaymentDialog } from '../components/register-payment-dialog';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from '@/lib/firebaseClient';

type DocType = 'ineUrl' | 'licenseUrl' | 'proofOfAddressUrl' | 'promissoryNoteUrl';

export default function DriverDetailPage() {
  const params = useParams();
  const driverId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const contractContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [driverPayments, setDriverPayments] = useState<RentalPayment[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<DocType | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const foundDriver = placeholderDrivers.find(d => d.id === driverId);
    setDriver(foundDriver || null);
    
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
    
     const updatedDriver = { 
        ...driver, 
        ...formData,
        contractDate: formData.contractDate ? new Date(formData.contractDate).toISOString() : undefined,
    };
    
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) {
      event.target.value = ""; // Reset input immediately
    }
    
    if (!file || !uploadingDocType) return;
    
    const currentDriverId = driver?.id;
    if (!currentDriverId) {
      toast({ title: 'Error', description: 'No se ha seleccionado un conductor válido.', variant: 'destructive' });
      return;
    }

    if (!storage) {
      toast({ title: 'Error', description: 'El almacenamiento de archivos no está configurado.', variant: 'destructive' });
      return;
    }

    if (isMounted.current) {
        setIsUploading(true);
    }
    
    try {
      toast({ title: 'Procesando imagen...', description: `Optimizando ${file.name}...` });
      const optimizedDataUrl = await optimizeImage(file, 800);

      toast({ title: 'Subiendo...', description: `Guardando el documento en la nube...` });
      const storageRef = ref(storage, `driver-documents/${currentDriverId}/${uploadingDocType}-${Date.now()}.jpg`);
      
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      const driverIndex = placeholderDrivers.findIndex(d => d.id === currentDriverId);
      if (driverIndex === -1) {
        throw new Error("No se pudo encontrar el conductor para actualizar después de la subida.");
      }
      
      const currentDriverData = placeholderDrivers[driverIndex];

      const updatedDriver: Driver = {
        ...currentDriverData,
        documents: {
          ...(currentDriverData.documents || {}),
          [uploadingDocType]: downloadURL,
        },
      };
      
      placeholderDrivers[driverIndex] = updatedDriver;
      await persistToFirestore(['drivers']);
      
      if (isMounted.current) {
        setDriver(updatedDriver);
      }

      toast({
        title: '¡Documento Subido!',
        description: `El documento se ha guardado correctamente.`,
      });

    } catch (err) {
      console.error("Error al subir documento:", err);
      toast({
        title: 'Error de Subida',
        description: `No se pudo guardar el documento. ${err instanceof Error ? err.message : 'Error desconocido.'}`,
        variant: 'destructive',
      });
    } finally {
      if (isMounted.current) {
        setIsUploading(false);
        setUploadingDocType(null);
      }
    }
  };

  const handleRegisterPayment = async (details: { amount: number; daysCovered: number; }) => {
    if (!driver || !assignedVehicle) return;

    const newPayment: RentalPayment = {
        id: `PAY_${Date.now().toString(36)}`,
        driverId: driver.id,
        driverName: driver.name,
        vehicleLicensePlate: assignedVehicle.licensePlate,
        paymentDate: new Date().toISOString(),
        amount: details.amount,
        daysCovered: details.daysCovered,
    };
    
    placeholderRentalPayments.push(newPayment);
    await persistToFirestore(['rentalPayments']);
    
    const updatedPayments = placeholderRentalPayments
        .filter(p => p.driverId === driverId)
        .sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime());
    setDriverPayments(updatedPayments);
    
    toast({ title: "Pago Registrado", description: `Se ha registrado el pago de ${formatCurrency(details.amount)}.` });
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
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
        </Button>
      </div>
      <div className="mb-6 grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-headline">
            {driver.name}
          </h1>
          <p className="text-muted-foreground">ID Conductor: {driver.id}</p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="details" className="font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white">Detalles</TabsTrigger>
          <TabsTrigger value="documents" className="font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white">Documentos</TabsTrigger>
          <TabsTrigger value="payments" className="font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white">Pagos</TabsTrigger>
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span>Contrato: {driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'No generado'}</span></div>
                    <Button onClick={() => setIsContractDialogOpen(true)} disabled={!driver?.depositAmount} size="sm">
                        <FileText className="mr-2 h-4 w-4"/> Generar Contrato
                    </Button>
                </div>
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
                     <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            setUploadingDocType(type as DocType);
                            fileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                    >
                        {isUploading && uploadingDocType === type ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        {isUploading && uploadingDocType === type
                            ? "Subiendo..."
                            : driver.documents?.[type as keyof Driver['documents']]
                            ? "Reemplazar"
                            : "Subir Documento"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historial de Pagos</CardTitle>
               <Button onClick={() => setIsPaymentDialogOpen(true)} disabled={!assignedVehicle}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            </CardHeader>
            <CardContent>
              {driverPayments.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Folio de Pago</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Días Cubiertos</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {driverPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.id}</TableCell>
                          <TableCell>{format(parseISO(payment.paymentDate), "dd MMM yyyy, HH:mm 'hrs'", { locale: es })}</TableCell>
                          <TableCell className="text-right">{payment.daysCovered.toFixed(2)}</TableCell>
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
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <DriverDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        driver={driver}
        onSave={handleSaveDriver}
      />
    </div>

    {driver && assignedVehicle && (
      <RegisterPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          driver={driver}
          vehicle={assignedVehicle}
          onSave={handleRegisterPayment}
      />
    )}

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
