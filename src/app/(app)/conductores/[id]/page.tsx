
"use client";

import { useParams, useRouter } from 'next/navigation';
import type { Driver, RentalPayment, ManualDebtEntry, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, User as UserIcon, Phone, Home, FileText, Upload, AlertTriangle, Car, DollarSign, Printer, ArrowLeft, PlusCircle, Loader2, FileX, Receipt, Trash2, Archive } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { DriverDialog } from '../components/driver-dialog';
import type { DriverFormValues } from '../components/driver-form';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { formatCurrency, optimizeImage } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays, startOfToday, isAfter, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { ContractContent } from '../components/contract-content';
import Image from "next/image";
import { RegisterPaymentDialog } from '../components/register-payment-dialog';
import { DebtDialog, type DebtFormValues } from '../components/debt-dialog';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from '@/lib/firebaseClient';
import { operationsService, personnelService, inventoryService } from '@/lib/services';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DocType = 'ineFrontUrl' | 'ineBackUrl' | 'licenseUrl' | 'proofOfAddressUrl' | 'promissoryNoteUrl';

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
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<DocType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingDebt, setEditingDebt] = useState<ManualDebtEntry | null>(null);


  const fetchDriverData = useCallback(async () => {
    if (!driverId) return;
    try {
        const [fetchedDriver, payments, vehiclesData] = await Promise.all([
            personnelService.getDriverById(driverId),
            operationsService.onRentalPaymentsUpdatePromise(),
            inventoryService.onVehiclesUpdatePromise()
        ]);
        if (isMounted.current) {
            setDriver(fetchedDriver || null);
            setDriverPayments(payments.filter(p => p.driverId === driverId).sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime()));
            setAllVehicles(vehiclesData);
        }
    } catch (error) {
        console.error("Failed to fetch driver data:", error);
        if (isMounted.current) setDriver(null);
    }
  }, [driverId]);

  useEffect(() => {
    isMounted.current = true;
    fetchDriverData();
    return () => { isMounted.current = false; };
  }, [fetchDriverData]);


  const assignedVehicle = useMemo(() => {
    if (!driver?.assignedVehicleId) return null;
    return allVehicles.find(v => v.id === driver.assignedVehicleId);
  }, [driver, allVehicles]);
  
  const debtInfo = useMemo(() => {
    if (!driver || !assignedVehicle?.dailyRentalCost) {
      return { totalDebt: 0, daysOwed: 0, balance: 0, calculatedRentDebt: 0, manualDebt: 0 };
    }
    
    const today = startOfToday();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Use a fixed start date for rent calculation as per previous request.
    const rentStartDate = new Date('2024-07-01');
    let totalExpectedAmountThisMonth = 0;

    if (!isAfter(rentStartDate, today)) {
        // Calculate days to charge within the current month, starting from July 1st.
        const startOfCalculation = isAfter(rentStartDate, monthStart) ? rentStartDate : monthStart;
        
        if (!isAfter(startOfCalculation, today)) {
            const daysToCharge = differenceInCalendarDays(today, startOfCalculation) + 1;
            totalExpectedAmountThisMonth = daysToCharge * assignedVehicle.dailyRentalCost;
        }
    }
    
    const paymentsThisMonth = driverPayments
        .filter(p => isAfter(parseISO(p.paymentDate), monthStart) || isAfter(monthStart, parseISO(p.paymentDate)))
        .reduce((sum, p) => sum + p.amount, 0);

    const balance = paymentsThisMonth - totalExpectedAmountThisMonth;
    const calculatedRentDebt = Math.max(0, -balance);
    
    const manualDebt = (driver.manualDebts || []).reduce((sum, debt) => sum + debt.amount, 0);
    const totalDebt = calculatedRentDebt + manualDebt;
    const daysOwed = assignedVehicle?.dailyRentalCost ? totalDebt / assignedVehicle.dailyRentalCost : 0;
    
    return { totalDebt, daysOwed, balance, calculatedRentDebt, manualDebt };

  }, [driver, assignedVehicle, driverPayments]);


  const handleSaveDriver = async (formData: DriverFormValues) => {
    try {
        await personnelService.saveDriver(formData, driverId);
        await fetchDriverData(); // Refresh data
        setIsEditDialogOpen(false);
        toast({ title: "Datos Actualizados", description: `Se guardaron los cambios para ${formData.name}.` });
    } catch (error) {
        toast({ title: "Error al Guardar", variant: "destructive"});
    }
  };
  
const handleAssignVehicle = async (newVehicleId: string) => {
  if (!driver) return toast({ title: "Error", description: "No se encontró el conductor.", variant: "destructive" });

  const oldVehicleId = driver.assignedVehicleId;

  try {
    const updates = [];

    // 1. Unassign the old vehicle if it exists
    if (oldVehicleId) {
      updates.push(inventoryService.saveVehicle({ assignedVehicleId: null } as any, oldVehicleId));
    }

    // 2. Assign the new vehicle
    updates.push(inventoryService.saveVehicle({ assignedVehicleId: driver.id } as any, newVehicleId));

    // 3. Update the driver's assigned vehicle ID
    updates.push(personnelService.saveDriver({ assignedVehicleId: newVehicleId }, driverId));

    await Promise.all(updates);
    
    await fetchDriverData();
    toast({ title: "Vehículo Asignado", description: "Se ha asignado el nuevo vehículo al conductor." });
  } catch(e) {
    console.error("Error al asignar vehículo:", e);
    toast({ title: "Error al Asignar", description: `Ocurrió un error: ${e instanceof Error ? e.message : 'Error desconocido'}`, variant: "destructive"});
  }
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

    if (isMounted.current) setIsUploading(true);
    
    try {
      toast({ title: 'Procesando imagen...', description: `Optimizando ${file.name}...` });
      const optimizedDataUrl = await optimizeImage(file, 800);

      toast({ title: 'Subiendo...', description: `Guardando el documento en la nube...` });
      const storageRef = ref(storage, `driver-documents/${currentDriverId}/${uploadingDocType}-${Date.now()}.jpg`);
      
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      const updatedDriverData: Partial<Driver> = {
          documents: { ...driver.documents, [uploadingDocType]: downloadURL }
      };
      
      await personnelService.saveDriver(updatedDriverData as any, driverId);
      await fetchDriverData();

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

    await operationsService.addRentalPayment(driverId, details.amount, undefined, undefined);
    await fetchDriverData();
    
    toast({ title: "Pago Registrado", description: `Se ha registrado el pago de ${formatCurrency(details.amount)}.` });
  };
  
  const handleOpenDebtDialog = (debt: ManualDebtEntry | null = null) => {
    setEditingDebt(debt);
    setIsDebtDialogOpen(true);
  };
  
  const handleSaveDebt = async (formData: DebtFormValues) => {
    if (!driver) return;
    let updatedDebts: ManualDebtEntry[];
    
    if (editingDebt) {
        // Update existing debt
        updatedDebts = (driver.manualDebts || []).map(d => d.id === editingDebt.id ? { ...d, ...formData } : d);
    } else {
        // Add new debt
        const newDebt: ManualDebtEntry = {
            id: `DEBT_${Date.now().toString(36)}`,
            date: new Date().toISOString(),
            ...formData
        };
        updatedDebts = [...(driver.manualDebts || []), newDebt];
    }

    const updatedDriver: Partial<Driver> = { manualDebts: updatedDebts };
    await personnelService.saveDriver(updatedDriver as any, driverId);
    await fetchDriverData();

    setIsDebtDialogOpen(false);
    setEditingDebt(null);
    toast({ title: `Adeudo ${editingDebt ? 'actualizado' : 'registrado'}` });
  };
  
  const handleDeleteDebt = async (debtId: string) => {
    if (!driver) return;
    
    const updatedDebts = (driver.manualDebts || []).filter(d => d.id !== debtId);
    const updatedDriver: Partial<Driver> = { manualDebts: updatedDebts };

    await personnelService.saveDriver(updatedDriver as any, driverId);
    await fetchDriverData();
    toast({ title: 'Adeudo Eliminado', variant: 'destructive' });
  };

  const handleArchiveDriver = async () => {
    if (!driver) return;
    try {
      await personnelService.archiveDriver(driver.id, !driver.isArchived);
      toast({ title: `Conductor ${driver.isArchived ? 'Restaurado' : 'Archivado'}` });
      router.push('/flotilla?tab=conductores'); 
    } catch (e) {
      toast({ title: "Error al archivar", variant: "destructive" });
    }
  };



  if (driver === undefined) {
    return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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

  const fleetVehicles = allVehicles.filter(v => v.isFleetVehicle);

  return (
    <>
    <div className="container mx-auto py-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" className="bg-white text-black hover:bg-gray-100" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
        </Button>
         <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" >
                  <Archive className="mr-2 h-4 w-4" />
                  {driver.isArchived ? 'Restaurar Conductor' : 'Archivar Conductor'}
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de {driver.isArchived ? 'restaurar' : 'archivar'} este registro?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción {driver.isArchived ? 'restaurará' : 'archivará'} el registro de {driver.name} y lo {driver.isArchived ? 'mostrará' : 'ocultará'} de las listas principales.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveDriver} className="bg-destructive hover:bg-destructive/90">
                      Sí, {driver.isArchived ? 'Restaurar' : 'Archivar'}
                  </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
            </Button>
        </div>
      </div>
      <div className="mb-6 grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-headline">
            {driver.name}
          </h1>
          <p className="text-muted-foreground">ID Conductor: {driver.id}</p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Detalles</TabsTrigger>
          <TabsTrigger value="documents" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Documentos</TabsTrigger>
          <TabsTrigger value="deuda" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Deuda</TabsTrigger>
          <TabsTrigger value="payments" className="font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Información del Conductor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>{driver.name}</span></div>
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
                { type: 'ineFrontUrl', label: 'INE (Frente)' },
                { type: 'ineBackUrl', label: 'INE (Reverso)' },
                { type: 'licenseUrl', label: 'Licencia de Conducir' },
                { type: 'proofOfAddressUrl', label: 'Comprobante de Domicilio' },
                { type: 'promissoryNoteUrl', label: 'Pagaré' },
              ].map(({ type, label }) => (
                <Card key={type}>
                  <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center border relative">
                      {driver.documents?.[type as keyof Driver['documents']] ? (
                        <Image src={driver.documents[type as keyof Driver['documents']]!} alt={label} layout="fill" className="object-contain" data-ai-hint="document photo" sizes="(max-width: 768px) 100vw, 50vw"/>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileX className="h-8 w-8" />
                            <p className="text-sm">Sin documento</p>
                        </div>
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

        <TabsContent value="deuda" className="space-y-6">
            <Card className="lg:col-span-1 bg-amber-50 dark:bg-amber-900/50 border-amber-200">
                <CardHeader>
                    <CardTitle className="text-lg text-amber-900 dark:text-amber-200">Estado de Cuenta</CardTitle>
                    <CardDescription className="text-amber-800 dark:text-amber-300">Resumen de la deuda del mes actual y cargos manuales.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">DEUDA TOTAL</p>
                        <p className="text-3xl font-bold text-destructive">{formatCurrency(debtInfo.totalDebt)}</p>
                        <p className="text-xs text-muted-foreground">(Renta Mes: {formatCurrency(debtInfo.calculatedRentDebt)} + Adeudos Manuales: {formatCurrency(debtInfo.manualDebt)})</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">DÍAS PENDIENTES (APROX)</p>
                        <p className="text-3xl font-bold">{debtInfo.daysOwed.toFixed(2)}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Historial de Adeudos Manuales</CardTitle>
                    <CardDescription>Cargos adicionales como multas, daños, etc.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDebtDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Adeudo
                  </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-black"><TableRow>
                          <TableHead className="text-white">Fecha</TableHead>
                          <TableHead className="text-white">Concepto</TableHead>
                          <TableHead className="text-right text-white">Monto</TableHead>
                          <TableHead className="text-right text-white">Acciones</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {(driver.manualDebts || []).length > 0 ? (
                            [...driver.manualDebts].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(debt => (
                              <TableRow key={debt.id}>
                                <TableCell>{format(parseISO(debt.date), "dd MMM, yyyy", { locale: es })}</TableCell>
                                <TableCell>{debt.note}</TableCell>
                                <TableCell className="text-right font-semibold text-destructive">{formatCurrency(debt.amount)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleOpenDebtDialog(debt)}><Edit className="h-4 w-4" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>¿Eliminar Adeudo?</AlertDialogTitle><AlertDialogDescription>Se eliminará el cargo de "{debt.note}" por {formatCurrency(debt.amount)}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteDebt(debt.id)} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay adeudos manuales registrados.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
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
                    <TableHeader className="bg-black"><TableRow>
                      <TableHead className="text-white">Folio de Pago</TableHead>
                      <TableHead className="text-white">Fecha</TableHead>
                      <TableHead className="text-right text-white">Días Cubiertos</TableHead>
                      <TableHead className="text-right text-white">Monto</TableHead>
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
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <Receipt className="h-12 w-12 mb-2" />
                    <h3 className="text-lg font-semibold text-foreground">No hay pagos registrados</h3>
                    <p className="text-sm">Cuando se registre un pago para este conductor, aparecerá aquí.</p>
                </div>
              )}
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
      <DebtDialog
        open={isDebtDialogOpen}
        onOpenChange={setIsDebtDialogOpen}
        onSave={handleSaveDebt}
        initialData={editingDebt ?? undefined}
      />
    </div>

    {driver && assignedVehicle && (
      <RegisterPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          driver={driver}
          vehicle={assignedVehicle}
          onSave={(details) => handleRegisterPayment(details)}
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

    
