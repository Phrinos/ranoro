

"use client";

import { useParams, useRouter } from 'next/navigation';
import type { Driver, RentalPayment, ManualDebtEntry, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Edit, User as UserIcon, Phone, Home, FileText, Upload, AlertTriangle, Car, DollarSign, ArrowLeft, Loader2, FileX, Archive, HandCoins, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { DriverDialog } from '../components/driver-dialog';
import type { DriverFormValues } from '../components/driver-form';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, optimizeImage } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContractContent } from '../components/contract-content';
import Image from "next/image";
import { RegisterPaymentDialog } from '../components/register-payment-dialog';
import { DebtDialog, type DebtFormValues } from '../components/debt-dialog';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from '@/lib/firebaseClient';
import { fleetService, personnelService, inventoryService } from '@/lib/services';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { AssignVehicleDialog } from '../components/assign-vehicle-dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const BalanceTabContent = lazy(() => import('../components/balance-tab-content'));

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
  const [manualDebts, setManualDebts] = useState<ManualDebtEntry[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<DocType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDebt, setEditingDebt] = useState<ManualDebtEntry | null>(null);
  const [isAssignVehicleDialogOpen, setIsAssignVehicleDialogOpen] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    if (!driverId) return;

    const unsubDriver = personnelService.onDriversUpdate((drivers) => {
        if(isMounted.current) setDriver(drivers.find(d => d.id === driverId) || null);
    });
    const unsubPayments = fleetService.onRentalPaymentsUpdate((payments) => {
        if(isMounted.current) setDriverPayments(payments.filter(p => p.driverId === driverId).sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime()));
    });
    const unsubDebts = personnelService.onManualDebtsUpdate(driverId, (debts) => {
        if(isMounted.current) setManualDebts(debts);
    });
    const unsubVehicles = inventoryService.onVehiclesUpdate((vehicles) => {
        if(isMounted.current) setAllVehicles(vehicles);
    });
    
    return () => {
        isMounted.current = false;
        unsubDriver();
        unsubPayments();
        unsubDebts();
        unsubVehicles();
    };
  }, [driverId]);

  const assignedVehicle = useMemo(() => {
    if (!driver?.assignedVehicleId) return null;
    return allVehicles.find(v => v.id === driver.assignedVehicleId);
  }, [driver, allVehicles]);

  const handleSaveDriver = async (formData: DriverFormValues) => {
    if (!driver) return;
    try {
        await personnelService.saveDriver(formData, driver.id);
        setIsEditDialogOpen(false);
        toast({ title: "Datos Actualizados", description: `Se guardaron los cambios para ${formData.name}.` });
    } catch (error) {
        console.error("Error al guardar conductor:", error);
        toast({ title: "Error al Guardar", description: "Ocurrió un problema al intentar guardar.", variant: "destructive"});
    }
  };
  
  const handleAssignVehicle = async (vehicleId: string | null) => {
    if (!driver) return;
    try {
        await personnelService.assignVehicleToDriver(driver, vehicleId, allVehicles);
        setIsAssignVehicleDialogOpen(false);
        toast({ title: "Vehículo Asignado", description: "La asignación del vehículo se ha actualizado." });
    } catch (error) {
        console.error("Error al asignar vehículo:", error);
        toast({ title: "Error de Asignación", description: "No se pudo actualizar el vehículo.", variant: "destructive" });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !uploadingDocType || !driver) return;
    setIsUploading(true);
    
    try {
      const optimizedDataUrl = await optimizeImage(file, 800);
      const storageRef = ref(storage, `driver-documents/${driver.id}/${uploadingDocType}-${Date.now()}.jpg`);
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      const updatedDriverData = {
          ...driver,
          documents: { ...driver.documents, [uploadingDocType]: downloadURL }
      };
      await personnelService.saveDriver(updatedDriverData, driverId);
      toast({ title: '¡Documento Subido!', description: 'El documento se ha guardado correctamente.' });
    } catch (err) {
      toast({ title: 'Error de Subida', variant: 'destructive' });
    } finally {
      if (isMounted.current) {
        setIsUploading(false);
        setUploadingDocType(null);
      }
    }
  };

  const handleRegisterPayment = async (details: { amount: number; daysCovered: number; }) => {
    if (!driver || !assignedVehicle) return;
    await fleetService.addRentalPayment(driverId, details.amount);
    toast({ title: "Pago Registrado", description: `Se ha registrado el pago de ${formatCurrency(details.amount)}.` });
  };
  
  const handleOpenDebtDialog = (debt: ManualDebtEntry | null = null) => {
    setEditingDebt(debt);
    setIsDebtDialogOpen(true);
  };
  
  const handleSaveDebt = async (formData: DebtFormValues) => {
    if (!driver) return;
    const isEditing = !!editingDebt;
    await personnelService.saveManualDebt(driverId, formData, editingDebt?.id);
    setIsDebtDialogOpen(false);
    setEditingDebt(null);
    toast({ title: `Adeudo ${isEditing ? 'actualizado' : 'registrado'}` });
  };
  
  const handleDeleteDebt = async (debtId: string) => {
    if (!driver) return;
    await personnelService.deleteManualDebt(debtId);
    toast({ title: 'Adeudo Eliminado', variant: 'destructive' });
  };
  
  const handleDeletePayment = async (payment: RentalPayment) => {
    if(!driver) return;
    await fleetService.deleteRentalPayment(payment.id);
    toast({ title: "Pago Eliminado", variant: "destructive" });
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

  if (driver === undefined) return <div className="container mx-auto py-8 text-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!driver) return (
    <div className="container mx-auto py-8 text-center">
      <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold">Conductor no encontrado</h1>
      <Button asChild className="mt-6"><Link href="/flotilla?tab=conductores">Volver a Conductores</Link></Button>
    </div>
  );

  return (
    <>
    <div className="container mx-auto py-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/flotilla?tab=conductores"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive"><Archive className="mr-2 h-4 w-4" />{driver.isArchived ? 'Restaurar' : 'Archivar'}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Seguro de {driver.isArchived ? 'restaurar' : 'archivar'} este registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción {driver.isArchived ? 'restaurará' : 'archivará'} a {driver.name} y lo {driver.isArchived ? 'mostrará' : 'ocultará'} de las listas principales.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveDriver} className="bg-destructive hover:bg-destructive/90">Sí, {driver.isArchived ? 'Restaurar' : 'Archivar'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{driver.name}</h1>
        {assignedVehicle ? (
          <p className="text-lg text-muted-foreground font-semibold flex items-center gap-2">
            <Car className="h-5 w-5"/> {assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.licensePlate})
          </p>
        ) : (
          <p className="text-muted-foreground">Sin vehículo asignado</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">ID Conductor: {driver.id}</p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="details">Detalles</TabsTrigger><TabsTrigger value="documents">Documentos</TabsTrigger><TabsTrigger value="balance"><HandCoins className="mr-2 h-4 w-4" />Saldo</TabsTrigger></TabsList>
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Información del Conductor</CardTitle><Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" />Editar</Button></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>{driver.name}</span></div>
                <div className="flex items-center gap-3"><Home className="h-4 w-4 text-muted-foreground" /><span>{driver.address}</span></div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{driver.phone}</span></div>
                <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><span>Tel. Emergencia: {driver.emergencyPhone}</span></div>
                <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-muted-foreground" /><span>Depósito: {formatCurrency(driver.depositAmount || 0)} de {formatCurrency(driver.requiredDepositAmount || 0)}</span></div>
                <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span>Contrato: {driver.contractDate ? format(parseISO(driver.contractDate), "dd MMM yyyy", { locale: es }) : 'No especificada'}</span></div>
              </CardContent>
            </Card>
             <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vehículo Asignado</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsAssignVehicleDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Cambiar Vehículo
                </Button>
              </CardHeader>
              <CardContent>
                {assignedVehicle ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><Car className="h-5 w-5" /><p className="font-semibold">{assignedVehicle.licensePlate} - {assignedVehicle.make} {assignedVehicle.model}</p></div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild><Link href={`/flotilla/${assignedVehicle.id}`}>Ver Vehículo</Link></Button>
                       <ConfirmDialog
                          triggerButton={<Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>}
                          title="¿Quitar Asignación?"
                          description={`Se desvinculará el vehículo ${assignedVehicle.licensePlate} de ${driver.name}.`}
                          onConfirm={() => handleAssignVehicle(null)}
                       />
                    </div>
                  </div>
                ) : <p className="text-muted-foreground">No hay vehículo asignado.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Documentos</CardTitle><CardDescription>Adjunte las imágenes de los documentos.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['ineFrontUrl', 'ineBackUrl', 'licenseUrl', 'proofOfAddressUrl', 'promissoryNoteUrl'].map(type => (
                <Card key={type}>
                  <CardHeader><CardTitle className="text-base">{type.replace('Url', '')}</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center border relative">
                      {driver.documents?.[type as keyof Driver['documents']] ? <Image src={driver.documents[type as keyof Driver['documents']]!} alt={type} layout="fill" className="object-contain" /> : <FileX className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => { setUploadingDocType(type as DocType); fileInputRef.current?.click(); }} disabled={isUploading}>
                      {isUploading && uploadingDocType === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {isUploading && uploadingDocType === type ? "Subiendo..." : "Subir/Reemplazar"}
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
              manualDebts={manualDebts}
              onAddDebt={() => handleOpenDebtDialog()} 
              onRegisterPayment={() => setIsPaymentDialogOpen(true)} 
              onDeleteDebt={handleDeleteDebt}
              onDeletePayment={handleDeletePayment}
              onEditDebt={handleOpenDebtDialog} 
            />
          </Suspense>
        </TabsContent>
      </Tabs>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <DriverDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} driver={driver} onSave={handleSaveDriver} />
      <DebtDialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen} onSave={handleSaveDebt} initialData={editingDebt ?? undefined} />
      {driver && <AssignVehicleDialog open={isAssignVehicleDialogOpen} onOpenChange={setIsAssignVehicleDialogOpen} driver={driver} allVehicles={allVehicles} onSave={handleAssignVehicle} />}
    </div>
    {driver && assignedVehicle && <RegisterPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} driver={driver} vehicle={assignedVehicle} onSave={handleRegisterPayment} />}
    {assignedVehicle && <UnifiedPreviewDialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen} title="Contrato de Arrendamiento"><ContractContent ref={contractContentRef} driver={driver} vehicle={assignedVehicle} /></UnifiedPreviewDialog>}
    </>
  );
}
