

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Printer, Copy, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { RegisterPaymentDialog } from './components/register-payment-dialog';
import type { RentalPayment, Driver, Vehicle, WorkshopInfo, VehicleExpense, OwnerWithdrawal } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareDesc, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { RentalReceiptContent } from './components/rental-receipt-content';
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import html2canvas from 'html2canvas';
import { inventoryService, operationsService, personnelService } from '@/lib/services';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/vehicle-expense-dialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/owner-withdrawal-dialog';

function RentasPageComponent() {
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<Partial<WorkshopInfo>>({});
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(personnelService.onDriversUpdate(setDrivers));
    unsubs.push(inventoryService.onVehiclesUpdate(setVehicles));
    unsubs.push(operationsService.onRentalPaymentsUpdate((data) => {
        setPayments(data);
        setIsLoading(false); // Consider loaded after payments are fetched
    }));

    const storedInfo = localStorage.getItem('workshopTicketInfo');
    if (storedInfo) setWorkshopInfo(JSON.parse(storedInfo));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);

  const handleSavePayment = async (driverId: string, amount: number, note: string | undefined, mileage?: number) => {
    try {
        const newPayment = await operationsService.addRentalPayment(driverId, amount, note, mileage);
        toast({ title: 'Pago Registrado' });
        setIsPaymentDialogOpen(false);
        setPaymentForReceipt(newPayment);
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveExpense = async (data: VehicleExpenseFormValues) => {
    try {
        await operationsService.addVehicleExpense(data);
        toast({ title: 'Gasto Registrado'});
        setIsExpenseDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleSaveWithdrawal = async (data: OwnerWithdrawalFormValues) => {
    try {
        await operationsService.addOwnerWithdrawal(data);
        toast({ title: 'Retiro Registrado'});
        setIsWithdrawalDialogOpen(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };
  
  const handleCopyAsImage = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
        const canvas = await html2canvas(receiptRef.current, { scale: 2.5, backgroundColor: null });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast({ title: "Copiado", description: "La imagen del recibo ha sido copiada." });
            }
        });
    } catch (e) {
        console.error("Error copying image:", e);
        toast({ title: "Error", description: "No se pudo copiar la imagen del recibo.", variant: "destructive" });
    }
  }, [toast]);
  
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => compareDesc(parseISO(a.paymentDate), parseISO(b.paymentDate)));
  }, [payments]);

  const uniqueOwners = useMemo(() => Array.from(new Set(vehicles.filter(v => v.isFleetVehicle).map(v => v.ownerName))).sort(), [vehicles]);
  
  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ingresos de Flotilla</h1>
        <p className="text-primary-foreground/80 mt-1">Registra y consulta los pagos de renta, gastos y retiros.</p>
      </div>
      
      <div className="flex justify-end gap-2 mb-6">
          <Button onClick={() => setIsWithdrawalDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300 w-full sm:w-auto">
            <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500"/>
            Retiro
          </Button>
          <Button onClick={() => setIsExpenseDialogOpen(true)} variant="outline" className="bg-white hover:bg-gray-100 text-black border-gray-300 w-full sm:w-auto">
             <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500"/>
             Gasto
          </Button>
          <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Pago
          </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Historial de Pagos de Renta</CardTitle></CardHeader>
          <CardContent>
             <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black">
                    <TableRow>
                        <TableHead className="text-white">Folio</TableHead>
                        <TableHead className="text-white">Fecha</TableHead>
                        <TableHead className="text-white">Conductor</TableHead>
                        <TableHead className="text-white">Vehículo</TableHead>
                        <TableHead className="text-right text-white">Monto</TableHead>
                        <TableHead className="text-right text-white">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {sortedPayments.length > 0 ? (
                        sortedPayments.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-mono">{p.id.slice(-6)}</TableCell>
                                <TableCell>{format(parseISO(p.paymentDate), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                                <TableCell className="font-semibold">{p.driverName}</TableCell>
                                <TableCell>{p.vehicleLicensePlate}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(p.amount)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => setPaymentForReceipt(p)}>
                                        <Printer className="h-4 w-4"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                     ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                No hay pagos registrados.
                            </TableCell>
                        </TableRow>
                     )}
                  </TableBody>
                </Table>
            </div>
          </CardContent>
      </Card>
      
      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={drivers}
        vehicles={vehicles}
        onSave={handleSavePayment}
      />
      
      <VehicleExpenseDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        fleetVehicles={vehicles.filter(v => v.isFleetVehicle)}
        onSave={handleSaveExpense}
      />

      <OwnerWithdrawalDialog
        open={isWithdrawalDialogOpen}
        onOpenChange={setIsWithdrawalDialogOpen}
        owners={uniqueOwners}
        onSave={handleSaveWithdrawal}
      />
      
      <PrintTicketDialog
        open={!!paymentForReceipt}
        onOpenChange={(isOpen) => !isOpen && setPaymentForReceipt(null)}
        title="Recibo de Pago de Renta"
        dialogContentClassName="printable-content"
        footerActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyAsImage}><Copy className="mr-2 h-4 w-4" /> Copiar Imagen</Button>
            <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Recibo</Button>
          </div>
        }
      >
        {paymentForReceipt && <RentalReceiptContent ref={receiptRef} payment={paymentForReceipt} workshopInfo={workshopInfo} />}
      </PrintTicketDialog>
    </>
  );
}

export default function RentasPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><RentasPageComponent /></Suspense>)
}


