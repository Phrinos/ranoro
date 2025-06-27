
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { placeholderDrivers, placeholderVehicles, placeholderRentalPayments, persistToFirestore, hydrateReady } from '@/lib/placeholder-data';
import type { Driver, Vehicle, RentalPayment } from '@/types';
import { RegisterPaymentDialog } from './components/register-payment-dialog';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { RentalReceiptContent } from './components/rental-receipt-content';
import { isToday, parseISO } from 'date-fns';

export default function RentasPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>(placeholderDrivers);
  const [payments, setPayments] = useState<RentalPayment[]>(placeholderRentalPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [version, setVersion] = useState(0); // To force re-renders
  const [hydrated, setHydrated] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
  }, []);
  
  useEffect(() => {
    setDrivers(placeholderDrivers);
    setPayments(placeholderRentalPayments);
  }, [hydrated, version]);


  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim()) return drivers;
    return drivers.filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drivers, searchTerm]);

  const dailyPaymentsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    payments.forEach(payment => {
      if (isToday(parseISO(payment.paymentDate))) {
        map.set(payment.driverId, true);
      }
    });
    return map;
  }, [payments]);
  
  const handleRegisterPayment = useCallback(async (driverId: string, amount: number) => {
    const driver = drivers.find(d => d.id === driverId);
    const vehicle = placeholderVehicles.find(v => v.id === driver?.assignedVehicleId);

    if (!driver || !vehicle) {
      toast({ title: "Error", description: "El conductor o su vehículo asignado no se encontraron.", variant: "destructive" });
      return;
    }
    
    const newPayment: RentalPayment = {
      id: `RENT_${Date.now().toString(36)}`,
      driverId: driver.id,
      driverName: driver.name,
      vehicleLicensePlate: vehicle.licensePlate,
      paymentDate: new Date().toISOString(),
      amount: amount,
    };
    
    placeholderRentalPayments.push(newPayment);
    await persistToFirestore(['rentalPayments']);
    setVersion(v => v + 1);
    setIsPaymentDialogOpen(false);
    
    setPaymentForReceipt(newPayment);
    setIsReceiptOpen(true);
    
    toast({ title: "Pago Registrado", description: `Se registró el pago de ${driver.name}.` });
  }, [drivers, toast]);

  return (
    <>
      <PageHeader
        title="Registro de Rentas"
        description="Lleva el control de los pagos diarios de la flotilla."
        actions={
          <Button onClick={() => setIsPaymentDialogOpen(true)}>
            Registrar Pago
          </Button>
        }
      />
      
      <div className="mb-6 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar conductor..."
          className="w-full rounded-lg bg-card pl-8 md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredDrivers.map(driver => {
          const hasPaidToday = dailyPaymentsMap.get(driver.id) || false;
          return (
            <div key={driver.id} className={`p-4 border rounded-lg shadow-sm ${hasPaidToday ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{driver.name}</h3>
                {hasPaidToday ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{placeholderVehicles.find(v => v.id === driver.assignedVehicleId)?.licensePlate || 'Sin vehículo'}</p>
            </div>
          );
        })}
      </div>
      
      {filteredDrivers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No se encontraron conductores.</p>
      )}

      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={drivers}
        vehicles={placeholderVehicles}
        onSave={handleRegisterPayment}
      />
      
      {paymentForReceipt && (
        <PrintTicketDialog
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          title="Recibo de Renta"
          dialogContentClassName="printable-content"
          footerActions={
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo
            </Button>
          }
        >
          <RentalReceiptContent ref={receiptRef} payment={paymentForReceipt} />
        </PrintTicketDialog>
      )}
    </>
  );
}
