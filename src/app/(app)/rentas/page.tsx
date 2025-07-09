"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Printer } from 'lucide-react';
import { RegisterPaymentDialog } from './components/register-payment-dialog';
import {
  placeholderDrivers,
  placeholderVehicles,
  placeholderRentalPayments,
  persistToFirestore,
  hydrateReady,
} from '@/lib/placeholder-data';
import type { RentalPayment, Driver, Vehicle } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, compareDesc, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { RentalReceiptContent } from './components/rental-receipt-content';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RentasPageComponent() {
  const [hydrated, setHydrated] = useState(false);
  const [version, setVersion] = useState(0);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateReady.then(() => {
      setHydrated(true);
      setDrivers([...placeholderDrivers]);
      setVehicles([...placeholderVehicles]);
      setPayments([...placeholderRentalPayments]);
    });
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);

  useEffect(() => {
    if (hydrated) {
      setDrivers([...placeholderDrivers]);
      setVehicles([...placeholderVehicles]);
      setPayments([...placeholderRentalPayments]);
    }
  }, [hydrated, version]);

  const handleSavePayment = async (driverId: string, amount: number, mileage?: number) => {
    const driver = drivers.find(d => d.id === driverId);
    const vehicle = vehicles.find(v => v.id === driver?.assignedVehicleId);

    if (!driver || !vehicle) {
      toast({ title: 'Error', description: 'No se pudo encontrar el conductor o su vehículo asignado.', variant: 'destructive' });
      return;
    }

    const newPayment: RentalPayment = {
      id: `PAY_${Date.now().toString(36)}`,
      driverId: driver.id,
      driverName: driver.name,
      vehicleLicensePlate: vehicle.licensePlate,
      paymentDate: new Date().toISOString(),
      amount: amount,
      daysCovered: amount / (vehicle.dailyRentalCost || 1), // Avoid division by zero
    };

    placeholderRentalPayments.push(newPayment);

    const keysToPersist: Array<'rentalPayments' | 'vehicles'> = ['rentalPayments'];

    // If mileage is provided, update the vehicle
    if (mileage !== undefined) {
        const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
        if (vehicleIndex > -1) {
            placeholderVehicles[vehicleIndex].currentMileage = mileage;
            placeholderVehicles[vehicleIndex].lastMileageUpdate = new Date().toISOString();
            keysToPersist.push('vehicles');
        }
    }

    await persistToFirestore(keysToPersist);
    
    toast({ title: 'Pago Registrado', description: `Se registró el pago de ${formatCurrency(amount)} para ${driver.name}.` });
    setIsPaymentDialogOpen(false);
  };
  
  // Sorting payments
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => compareDesc(parseISO(a.paymentDate), parseISO(b.paymentDate)));
  }, [payments]);
  
  // State for reprinting receipt
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  
  return (
    <>
      <PageHeader
        title="Pagos de Renta de Flotilla"
        description="Registra y consulta los pagos de renta de los conductores."
        actions={
          <Button onClick={() => setIsPaymentDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Pago
          </Button>
        }
      />
      
      <Card>
          <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
          </CardHeader>
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
                                <TableCell className="font-mono">{p.id}</TableCell>
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
      
      <PrintTicketDialog
        open={!!paymentForReceipt}
        onOpenChange={(isOpen) => !isOpen && setPaymentForReceipt(null)}
        title="Recibo de Pago de Renta"
        dialogContentClassName="printable-content"
        footerActions={ <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Recibo</Button> }
      >
        {paymentForReceipt && <RentalReceiptContent ref={receiptRef} payment={paymentForReceipt} />}
      </PrintTicketDialog>
    </>
  );
}

export default function RentasPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><RentasPageComponent /></Suspense>)
}
