
"use client";

import { useParams, useRouter } from 'next/navigation';
import type { Driver, RentalPayment, ManualDebtEntry, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, User as UserIcon, Phone, Home, FileText, Upload, AlertTriangle, Car, DollarSign, Printer, ArrowLeft, PlusCircle, Loader2, FileX, Receipt, Trash2, Archive, HandCoins } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { DriverDialog } from '../components/driver-dialog';
import type { DriverFormValues } from '../components/driver-form';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { formatCurrency, optimizeImage } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays, startOfToday, isAfter, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContractContent } from '../components/contract-content';
import Image from "next/image";
import { RegisterPaymentDialog } from '../components/register-payment-dialog';
import { DebtDialog, type DebtFormValues } from '../components/debt-dialog';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from '@/lib/firebaseClient';
import { fleetService, personnelService, inventoryService } from '@/lib/services';
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
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';

const BalanceTabContent = lazy(() => import('../components/balance-tab-content').then(module => ({ default: module.BalanceTabContent })));

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
            fleetService.onRentalPaymentsUpdatePromise(),
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
  
const handleAssignVehicle = useCallback(async (newVehicleId: string | null) => {
    if (!driver || !db) return toast({ title: "Error", description: "No se encontró el conductor.", variant: "destructive" });

    const batch = writeBatch(db);
    const oldVehicleId = driver.assignedVehicleId;

    // 1. Unassign the old vehicle from this driver
    if (oldVehicleId) {
        batch.update(inventoryService.getVehicleDocRef(oldVehicleId), { assignedDriverId: null });
    }

    // 2. Unassign the new vehicle from any other driver it might be assigned to
    if (newVehicleId) {
        const vehicleToAssign = allVehicles.find(v => v.id === newVehicleId);
        if (vehicleToAssign?.assignedDriverId && vehicleToAssign.assignedDriverId !== driver.id) {
            batch.update(personnelService.getDriverDocRef(vehicleToAssign.assignedDriverId), { assignedVehicleId: null });
        }
        
        // 3. Assign new vehicle to this driver and vice versa
        batch.update(inventoryService.getVehicleDocRef(newVehicleId), { assignedDriverId: driver.id });
    }
    
    // 4. Update the driver's assigned vehicle ID
    batch.update(personnelService.getDriverDocRef(driver.id), { assignedVehicleId: newVehicleId });

    try {
        await batch.commit();
        await fetchDriverData(); // Refresh all data
        toast({ title: "Vehículo Asignado", description: "La asignación ha sido actualizada." });
    } catch(e) {
        console.error("Error al asignar vehículo:", e);
        toast({ title: "Error al Asignar", description: `Ocurrió un error: ${e instanceof Error ? e.message : 'Error desconocido'}`, variant: "destructive"});
    }
}, [driver, allVehicles, fetchDriverData, toast]);

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

    await fleetService.addRentalPayment(driverId, details.amount, undefined, undefined);
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
  const depositPaid = driver.depositAmount || 0;
  const depositRequired = driver.requiredDepositAmount || 0;
  const depositOwed = Math.max(0, depositRequired - depositPaid);

  return (
    <>
    <div className="container mx-auto py-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" className="bg-white text-black hover:bg-gray-100" asChild>
            <Link href="/flotilla?tab=conductores">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Link>
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
        </div>
      </div>
      <div className="mb-6 grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-headline">
            {driver.name}
          </h1>
          <p className="text-muted-foreground">ID Conductor: {driver.id}</p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
            <TabsTrigger value="details" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Detalles</TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Documentos</TabsTrigger>
            <TabsTrigger value="balance" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
              <HandCoins className="mr-2 h-4 w-4" /> Saldo
            </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Información del Conductor</CardTitle>
                 <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>{driver.name}</span></div>
                <div className="flex items-center gap-3"><Home className="h-4 w-4 text-muted-foreground" /><span>{driver.address}</span></div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{driver.phone}</span></div>
                <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><span>Tel. Emergencia: {driver.emergencyPhone}</span></div>
                <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                        Depósito: {formatCurrency(depositPaid)} de {formatCurrency(depositRequired)}
                        {depositOwed > 0 && <span className="text-destructive font-semibold"> (Adeudo: {formatCurrency(depositOwed)})</span>}
                    </span>
                </div>
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
                  <Select onValueChange={handleAssignVehicle} value={driver.assignedVehicleId || ""}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar vehículo de la flotilla" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={"null"}>-- Ninguno --</SelectItem>
                      {fleetVehicles.map(v => (
                        <SelectItem key={v.id} value={v.id} disabled={!!v.assignedDriverId && v.assignedDriverId !== driver.id}>
                            {v.licensePlate} - {v.make} {v.model} {v.assignedDriverId && v.assignedDriverId !== driver.id ? '(Asignado a otro)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
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

        <TabsContent value="balance" className="mt-6">
          <Suspense fallback={<Loader2 className="animate-spin mx-auto my-8" />}>
            <BalanceTabContent
              driver={driver}
              vehicle={assignedVehicle}
              payments={driverPayments}
              onAddDebt={() => handleOpenDebtDialog()}
              onRegisterPayment={() => setIsPaymentDialogOpen(true)}
              onDeleteDebt={handleDeleteDebt}
              onEditDebt={handleOpenDebtDialog}
            />
          </Suspense>
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
      <UnifiedPreviewDialog
        open={isContractDialogOpen}
        onOpenChange={setIsContractDialogOpen}
        title="Contrato de Arrendamiento"
      >
        <ContractContent ref={contractContentRef} driver={driver} vehicle={assignedVehicle} />
      </UnifiedPreviewDialog>
    )}
    </>
  );
}
