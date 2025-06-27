
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Printer, DollarSign } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import {
  placeholderDrivers,
  placeholderVehicles,
  placeholderRentalPayments,
  placeholderOwnerWithdrawals,
  persistToFirestore,
  hydrateReady,
} from '@/lib/placeholder-data';
import type { Driver, Vehicle, RentalPayment, OwnerWithdrawal } from '@/types';
import { RegisterPaymentDialog } from './components/register-payment-dialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/owner-withdrawal-dialog';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { RentalReceiptContent } from './components/rental-receipt-content';
import { isToday, parseISO, format, isValid, compareDesc } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RentasPage() {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const [payments, setPayments] = useState<RentalPayment[]>(placeholderRentalPayments);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>(placeholderOwnerWithdrawals);

  useEffect(() => {
    hydrateReady.then(() => {
      setHydrated(true);
      // Ensure local state is in sync with placeholder data after hydration
      setPayments([...placeholderRentalPayments]);
      setWithdrawals([...placeholderOwnerWithdrawals]);
    });
  }, []);

  useEffect(() => {
      setPayments([...placeholderRentalPayments]);
      setWithdrawals([...placeholderOwnerWithdrawals]);
  }, [version]); // Re-sync when data changes

  const filteredPayments = useMemo(() => {
    let list = [...payments].sort((a,b) => compareDesc(parseISO(a.paymentDate), parseISO(b.paymentDate)));
    if (!searchTerm.trim()) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(payment =>
      payment.driverName.toLowerCase().includes(lowerSearch) ||
      payment.vehicleLicensePlate.toLowerCase().includes(lowerSearch) ||
      payment.id.toLowerCase().includes(lowerSearch)
    );
  }, [payments, searchTerm]);

  const filteredWithdrawals = useMemo(() => {
    let list = [...withdrawals].sort((a,b) => compareDesc(parseISO(a.date), parseISO(b.date)));
    if (!searchTerm.trim()) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(w =>
      w.ownerName.toLowerCase().includes(lowerSearch) ||
      (w.reason && w.reason.toLowerCase().includes(lowerSearch))
    );
  }, [withdrawals, searchTerm]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    placeholderVehicles.filter(v => v.isFleetVehicle).forEach(v => owners.add(v.ownerName));
    return Array.from(owners);
  }, []);

  const handleRegisterPayment = useCallback(async (driverId: string, amount: number) => {
    const driver = placeholderDrivers.find(d => d.id === driverId);
    const vehicle = placeholderVehicles.find(v => v.id === driver?.assignedVehicleId);

    if (!driver || !vehicle) {
      toast({ title: "Error", description: "El conductor o su vehículo asignado no se encontraron.", variant: "destructive" });
      return;
    }
    
    const newPayment: RentalPayment = {
      id: `PAY_${Date.now().toString(36)}`,
      driverId: driver.id,
      driverName: driver.name,
      vehicleLicensePlate: vehicle.licensePlate,
      paymentDate: new Date().toISOString(),
      amount: amount,
      daysCovered: vehicle.dailyRentalCost ? amount / vehicle.dailyRentalCost : 0,
    };
    
    placeholderRentalPayments.push(newPayment);
    await persistToFirestore(['rentalPayments']);
    setVersion(v => v + 1);
    setIsPaymentDialogOpen(false);
    
    setPaymentForReceipt(newPayment);
    setIsReceiptOpen(true);
    
    toast({ title: "Pago Registrado", description: `Se registró el pago de ${driver.name}.` });
  }, [toast]);
  
  const handleSaveWithdrawal = useCallback(async (values: OwnerWithdrawalFormValues) => {
      const newWithdrawal: OwnerWithdrawal = {
          id: `WDRL_${Date.now().toString(36)}`,
          date: new Date().toISOString(),
          ...values
      };
      
      placeholderOwnerWithdrawals.push(newWithdrawal);
      await persistToFirestore(['ownerWithdrawals']);
      setVersion(v => v + 1);
      setIsWithdrawalDialogOpen(false);
      
      toast({title: "Retiro Registrado", description: `Se registró un retiro para ${values.ownerName}.`});
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <PageHeader
        title="Pago de Rentas"
        description="Lleva el control de los pagos y retiros de la flotilla."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" /> Registrar Retiro
            </Button>
            <Button onClick={() => setIsPaymentDialogOpen(true)}>
              Registrar Pago
            </Button>
          </div>
        }
      />
      
      <div className="mb-6 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar transacción..."
          className="w-full rounded-lg bg-card pl-8 md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="pagos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="pagos">Pagos de Renta</TabsTrigger>
          <TabsTrigger value="retiros">Retiros de Propietarios</TabsTrigger>
        </TabsList>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos de Renta</CardTitle>
              <CardDescription>Pagos recibidos de los conductores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? filteredPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{format(parseISO(p.paymentDate), "dd MMM, HH:mm", {locale: es})}</TableCell>
                        <TableCell>{p.driverName}</TableCell>
                        <TableCell>{p.vehicleLicensePlate}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay pagos registrados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retiros">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Retiros de Propietarios</CardTitle>
              <CardDescription>Salidas de dinero de las ganancias de la flotilla.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWithdrawals.length > 0 ? filteredWithdrawals.map(w => (
                      <TableRow key={w.id}>
                        <TableCell>{format(parseISO(w.date), "dd MMM, HH:mm", {locale: es})}</TableCell>
                        <TableCell>{w.ownerName}</TableCell>
                        <TableCell>{w.reason || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold text-destructive">{formatCurrency(w.amount)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay retiros registrados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={placeholderDrivers}
        vehicles={placeholderVehicles}
        onSave={handleRegisterPayment}
      />
      
      <OwnerWithdrawalDialog
        open={isWithdrawalDialogOpen}
        onOpenChange={setIsWithdrawalDialogOpen}
        owners={uniqueOwners}
        onSave={handleSaveWithdrawal}
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
