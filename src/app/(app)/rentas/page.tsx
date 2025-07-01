
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Printer, DollarSign, ListCollapse, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import {
  placeholderDrivers,
  placeholderVehicles,
  placeholderRentalPayments,
  placeholderOwnerWithdrawals,
  placeholderVehicleExpenses,
  persistToFirestore,
  hydrateReady,
} from '@/lib/placeholder-data';
import type { RentalPayment, OwnerWithdrawal, VehicleExpense } from '@/types';
import { RegisterPaymentDialog } from './components/register-payment-dialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './components/owner-withdrawal-dialog';
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './components/vehicle-expense-dialog';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { RentalReceiptContent } from './components/rental-receipt-content';
import { parseISO, format, isValid, compareDesc, differenceInCalendarDays, startOfToday, isAfter, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, compareAsc } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RentasPage() {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [paymentForReceipt, setPaymentForReceipt] = useState<RentalPayment | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const [payments, setPayments] = useState<RentalPayment[]>(placeholderRentalPayments);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>(placeholderOwnerWithdrawals);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>(placeholderVehicleExpenses);

  useEffect(() => {
    hydrateReady.then(() => {
      setHydrated(true);
      // Ensure local state is in sync with placeholder data after hydration
      setPayments([...placeholderRentalPayments]);
      setWithdrawals([...placeholderOwnerWithdrawals]);
      setVehicleExpenses([...placeholderVehicleExpenses]);
    });
  }, []);

  useEffect(() => {
      setPayments([...placeholderRentalPayments]);
      setWithdrawals([...placeholderOwnerWithdrawals]);
      setVehicleExpenses([...placeholderVehicleExpenses]);
  }, [version]); // Re-sync when data changes

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handlePreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));

  const selectedMonthRange = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return { start, end };
  }, [selectedDate]);


  const indebtedDrivers = useMemo(() => {
    if (!hydrated) return [];
    
    // Optimization: Pre-calculate total payments for each driver
    const paymentsByDriver = new Map<string, number>();
    placeholderRentalPayments.forEach(p => {
        paymentsByDriver.set(p.driverId, (paymentsByDriver.get(p.driverId) || 0) + p.amount);
    });

    return placeholderDrivers
      .map(driver => {
        if (!driver.contractDate) return null;

        const vehicle = placeholderVehicles.find(v => v.id === driver.assignedVehicleId);
        if (!vehicle?.dailyRentalCost) return null;

        const contractStartDate = parseISO(driver.contractDate);
        const today = startOfToday();
        
        if (isAfter(contractStartDate, today)) {
          return null;
        }

        const daysSinceContractStart = differenceInCalendarDays(today, contractStartDate) + 1;
        const totalExpectedAmount = daysSinceContractStart * vehicle.dailyRentalCost;
        
        const totalPaidAmount = paymentsByDriver.get(driver.id) || 0;
          
        const debtAmount = Math.max(0, totalExpectedAmount - totalPaidAmount);
        const daysOwed = debtAmount > 0 ? debtAmount / vehicle.dailyRentalCost : 0;
        
        if (daysOwed > 2) {
          return {
            id: driver.id,
            name: driver.name,
            daysOwed: Math.floor(daysOwed), // Show whole days
            debtAmount: debtAmount,
            vehicleLicensePlate: vehicle.licensePlate,
          };
        }
        
        return null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => b.daysOwed - a.daysOwed); // Sort by most days owed
  }, [hydrated]);
  
  const overduePaperwork = useMemo(() => {
    if (!hydrated) return [];
    const today = startOfToday();
    const alerts: { vehicleId: string; vehicleLicensePlate: string; paperworkId: string; paperworkName: string; dueDate: string; }[] = [];

    placeholderVehicles
      .filter(v => v.isFleetVehicle && v.paperwork)
      .forEach(vehicle => {
        vehicle.paperwork!.forEach(p => {
          const dueDate = parseISO(p.dueDate);
          if (p.status === 'Pendiente' && isValid(dueDate) && !isAfter(dueDate, today)) {
            alerts.push({
              vehicleId: vehicle.id,
              vehicleLicensePlate: vehicle.licensePlate,
              paperworkId: p.id,
              paperworkName: p.name,
              dueDate: p.dueDate,
            });
          }
        });
      });
    
    return alerts.sort((a,b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
  }, [hydrated]);


  const filteredPayments = useMemo(() => {
    const { start, end } = selectedMonthRange;
    const list = [...payments].filter(p => {
        const pDate = parseISO(p.paymentDate);
        return isValid(pDate) && isWithinInterval(pDate, { start, end });
    }).sort((a,b) => compareDesc(parseISO(a.paymentDate), parseISO(b.paymentDate)));

    if (!searchTerm.trim()) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(payment =>
      payment.driverName.toLowerCase().includes(lowerSearch) ||
      payment.vehicleLicensePlate.toLowerCase().includes(lowerSearch) ||
      payment.id.toLowerCase().includes(lowerSearch)
    );
  }, [payments, searchTerm, selectedMonthRange]);

  const filteredWithdrawals = useMemo(() => {
    const { start, end } = selectedMonthRange;
    const list = [...withdrawals].filter(w => {
        const wDate = parseISO(w.date);
        return isValid(wDate) && isWithinInterval(wDate, { start, end });
    }).sort((a,b) => compareDesc(parseISO(a.date), parseISO(b.date)));

    if (!searchTerm.trim()) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(w =>
      w.ownerName.toLowerCase().includes(lowerSearch) ||
      (w.reason && w.reason.toLowerCase().includes(lowerSearch))
    );
  }, [withdrawals, searchTerm, selectedMonthRange]);

  const filteredVehicleExpenses = useMemo(() => {
    const { start, end } = selectedMonthRange;
    const list = [...vehicleExpenses].filter(e => {
        const eDate = parseISO(e.date);
        return isValid(eDate) && isWithinInterval(eDate, { start, end });
    }).sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)));
    
    if (!searchTerm.trim()) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(e =>
        e.vehicleLicensePlate.toLowerCase().includes(lowerSearch) ||
        e.description.toLowerCase().includes(lowerSearch)
    );
  }, [vehicleExpenses, searchTerm, selectedMonthRange]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    placeholderVehicles.filter(v => v.isFleetVehicle).forEach(v => owners.add(v.ownerName));
    return Array.from(owners);
  }, []);

  const fleetVehicles = useMemo(() => placeholderVehicles.filter(v => v.isFleetVehicle), []);


  const handleRegisterPayment = useCallback(async (driverId: string, amount: number, mileage?: number) => {
    const driver = placeholderDrivers.find(d => d.id === driverId);
    const vehicle = placeholderVehicles.find(v => v.id === driver?.assignedVehicleId);

    if (!driver || !vehicle) {
      toast({ title: "Error", description: "El conductor o su vehículo asignado no se encontraron.", variant: "destructive" });
      return;
    }

    if (mileage !== undefined && mileage !== null) {
      const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicle.id);
      if (vehicleIndex > -1) {
        placeholderVehicles[vehicleIndex].currentMileage = mileage;
        placeholderVehicles[vehicleIndex].lastMileageUpdate = new Date().toISOString();
      }
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
    await persistToFirestore(['rentalPayments', 'vehicles']);
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

  const handleSaveVehicleExpense = useCallback(async (values: VehicleExpenseFormValues) => {
      const vehicle = placeholderVehicles.find(v => v.id === values.vehicleId);
      if (!vehicle) {
          toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });
          return;
      }
      
      const newExpense: VehicleExpense = {
          id: `VEXP_${Date.now().toString(36)}`,
          vehicleId: vehicle.id,
          vehicleLicensePlate: vehicle.licensePlate,
          date: new Date().toISOString(),
          ...values
      };
      
      placeholderVehicleExpenses.push(newExpense);
      await persistToFirestore(['vehicleExpenses']);
      setVersion(v => v + 1);
      setIsExpenseDialogOpen(false);
      
      toast({title: "Gasto Registrado", description: `Se registró un gasto para ${vehicle.licensePlate}.`});
  }, [toast]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-900/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="h-5 w-5" />
                    Conductores con Atraso Mayor a 2 Días
                </CardTitle>
            </CardHeader>
            <CardContent>
                {indebtedDrivers.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {indebtedDrivers.map(driver => (
                            <Link href={`/conductores/${driver.id}`} key={driver.id} className="flex justify-between items-center p-2 rounded-md hover:bg-orange-100 dark:hover:bg-orange-800/50 transition-colors">
                                <div>
                                    <p className="font-semibold">{driver.name}</p>
                                    <p className="text-xs text-muted-foreground">{driver.vehicleLicensePlate}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-destructive text-lg">{driver.daysOwed} días</p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(driver.debtAmount)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No hay conductores con atrasos significativos.</p>
                )}
            </CardContent>
        </Card>
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-900/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-5 w-5" />
                    Trámites Vencidos o por Vencer
                </CardTitle>
            </CardHeader>
            <CardContent>
                {overduePaperwork.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {overduePaperwork.map(item => (
                            <Link href={`/flotilla/${item.vehicleId}`} key={item.paperworkId} className="flex justify-between items-center p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors">
                                <div>
                                    <p className="font-semibold">{item.vehicleLicensePlate}: {item.paperworkName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-destructive text-sm">Vence:</p>
                                    <p className="text-xs text-muted-foreground">{format(parseISO(item.dueDate), "dd MMM yyyy", { locale: es })}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No hay trámites vencidos.</p>
                )}
            </CardContent>
        </Card>
      </div>
      
      <PageHeader
        title="Principal"
        description="Lleva el control de los pagos y retiros de la flotilla."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(true)}>
              <ListCollapse className="mr-2 h-4 w-4" /> Registrar Gasto de Vehículo
            </Button>
            <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" /> Registrar Retiro
            </Button>
            <Button onClick={() => setIsPaymentDialogOpen(true)}>
              Registrar Pago
            </Button>
          </div>
        }
      />
      
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-center w-36">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="relative flex-grow w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Buscar en el mes seleccionado..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="pagos" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
          <TabsTrigger value="pagos">Pagos de Renta</TabsTrigger>
          <TabsTrigger value="retiros">Retiros de Propietarios</TabsTrigger>
          <TabsTrigger value="gastos">Gastos de Vehículos</TabsTrigger>
        </TabsList>

        <TabsContent value="pagos">
          <Card>
            <CardHeader><CardTitle>Historial de Pagos de Renta</CardTitle><CardDescription>Pagos recibidos de los conductores.</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-lg border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Conductor</TableHead><TableHead>Vehículo</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredPayments.length > 0 ? filteredPayments.map(p => (
                      <TableRow key={p.id}><TableCell>{format(parseISO(p.paymentDate), "dd MMM, HH:mm", {locale: es})}</TableCell><TableCell>{p.driverName}</TableCell><TableCell>{p.vehicleLicensePlate}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell></TableRow>
                    )) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">No hay pagos registrados.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retiros">
          <Card>
            <CardHeader><CardTitle>Historial de Retiros de Propietarios</CardTitle><CardDescription>Salidas de dinero de las ganancias de la flotilla.</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-lg border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Propietario</TableHead><TableHead>Motivo</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredWithdrawals.length > 0 ? filteredWithdrawals.map(w => (
                      <TableRow key={w.id}><TableCell>{format(parseISO(w.date), "dd MMM, HH:mm", {locale: es})}</TableCell><TableCell>{w.ownerName}</TableCell><TableCell>{w.reason || 'N/A'}</TableCell><TableCell className="text-right font-semibold text-destructive">{formatCurrency(w.amount)}</TableCell></TableRow>
                    )) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">No hay retiros registrados.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gastos">
          <Card>
            <CardHeader><CardTitle>Historial de Gastos de Vehículos</CardTitle><CardDescription>Gastos directos asociados a los vehículos de la flotilla.</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-lg border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vehículo</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredVehicleExpenses.length > 0 ? filteredVehicleExpenses.map(e => (
                      <TableRow key={e.id}><TableCell>{format(parseISO(e.date), "dd MMM, HH:mm", {locale: es})}</TableCell><TableCell>{e.vehicleLicensePlate}</TableCell><TableCell>{e.description}</TableCell><TableCell className="text-right font-semibold text-destructive">{formatCurrency(e.amount)}</TableCell></TableRow>
                    )) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">No hay gastos de vehículos registrados.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <RegisterPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} drivers={placeholderDrivers} vehicles={placeholderVehicles} onSave={handleRegisterPayment}/>
      <OwnerWithdrawalDialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen} owners={uniqueOwners} onSave={handleSaveWithdrawal}/>
      <VehicleExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} fleetVehicles={fleetVehicles} onSave={handleSaveVehicleExpense}/>
      
      {paymentForReceipt && (
        <PrintTicketDialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen} title="Recibo de Renta" dialogContentClassName="printable-content" footerActions={<Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Recibo</Button>}>
          <RentalReceiptContent ref={receiptRef} payment={paymentForReceipt} />
        </PrintTicketDialog>
      )}
    </>
  );
}
