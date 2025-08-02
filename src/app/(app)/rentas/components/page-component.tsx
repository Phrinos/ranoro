// src/app/(app)/rentas/components/page-component.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RentalPayment, Driver, Vehicle, WorkshopInfo, VehicleExpense, OwnerWithdrawal } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { startOfDay, endOfDay, parseISO, isWithinInterval, isValid } from 'date-fns';

import { inventoryService, operationsService, personnelService } from '@/lib/services';
import { RegisterPaymentDialog } from "./register-payment-dialog";
import { VehicleExpenseDialog, type VehicleExpenseFormValues } from './vehicle-expense-dialog';
import { OwnerWithdrawalDialog, type OwnerWithdrawalFormValues } from './owner-withdrawal-dialog';
import { ResumenTab } from './ResumenTab';
import { EstadoCuentaTab } from './EstadoCuentaTab';
import { HistorialTab } from './HistorialTab';
import { GastosRetirosTab } from './GastosRetirosTab';
import { ReportesTab } from './ReportesTab';

function RentasPageComponent({ tab, action }: { tab?: string, action?: string | null }) {
  const defaultTab = tab || 'resumen';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(true);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<Partial<WorkshopInfo>>({});
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (action === 'registrar') {
      setIsPaymentDialogOpen(true);
    }
  }, [action]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    setIsLoading(true);

    unsubs.push(personnelService.onDriversUpdate(setDrivers));
    unsubs.push(inventoryService.onVehiclesUpdate(setVehicles));
    unsubs.push(operationsService.onVehicleExpensesUpdate(setExpenses));
    unsubs.push(operationsService.onOwnerWithdrawalsUpdate(setWithdrawals));
    unsubs.push(operationsService.onRentalPaymentsUpdate((data) => {
        setPayments(data);
        setIsLoading(false);
    }));

    const storedInfo = localStorage.getItem('workshopTicketInfo');
    if (storedInfo) setWorkshopInfo(JSON.parse(storedInfo));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleSavePayment = async (driverId: string, amount: number, note: string | undefined, mileage?: number) => {
    try {
        const newPayment = await operationsService.addRentalPayment(driverId, amount, note, mileage);
        toast({ title: 'Pago Registrado' });
        setIsPaymentDialogOpen(false);
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

  const totalCashBalance = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfDay(now), end: endOfDay(now) };

    const totalIncome = payments
      .filter(p => isValid(parseISO(p.paymentDate)) && isWithinInterval(parseISO(p.paymentDate), interval))
      .reduce((sum, p) => sum + p.amount, 0);
      
    const totalWithdrawals = withdrawals
      .filter(w => isValid(parseISO(w.date)) && isWithinInterval(parseISO(w.date), interval))
      .reduce((sum, w) => sum + w.amount, 0);
      
    const totalVehicleExpenses = expenses
      .filter(e => isValid(parseISO(e.date)) && isWithinInterval(parseISO(e.date), interval))
      .reduce((sum, e) => sum + e.amount, 0);
      
    return totalIncome - totalWithdrawals - totalVehicleExpenses;
  }, [payments, withdrawals, expenses]);

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
          <div className="flex items-center gap-2 p-2 h-10 rounded-md border bg-card text-card-foreground shadow-sm">
            <Wallet className="h-5 w-5 text-green-500" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground -mb-1">Caja</span>
              <span className="font-bold">{formatCurrency(totalCashBalance)}</span>
            </div>
          </div>
          <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Pago
          </Button>
      </div>
      
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full mb-6">
                <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                    <TabsTrigger value="resumen" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Resumen</TabsTrigger>
                    <TabsTrigger value="estado_cuenta" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Estado de Cuenta</TabsTrigger>
                    <TabsTrigger value="historial" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Historial</TabsTrigger>
                    <TabsTrigger value="gastos_retiros" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Gastos y Retiros</TabsTrigger>
                    <TabsTrigger value="reportes" className="flex-1 min-w-[20%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Reportes</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="resumen" className="space-y-6">
                <ResumenTab payments={payments} expenses={expenses} monthlyBalances={[]} />
            </TabsContent>
            <TabsContent value="estado_cuenta">
                <EstadoCuentaTab drivers={drivers} vehicles={vehicles} payments={payments} />
            </TabsContent>
            <TabsContent value="historial">
                 <HistorialTab allPayments={payments} workshopInfo={workshopInfo} drivers={drivers} vehicles={vehicles} />
            </TabsContent>
            <TabsContent value="gastos_retiros">
              <GastosRetirosTab expenses={expenses} withdrawals={withdrawals} />
            </TabsContent>
            <TabsContent value="reportes" className="mt-6 space-y-6">
              <ReportesTab vehicles={vehicles} />
            </TabsContent>
      </Tabs>
      
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
        owners={Array.from(new Set(vehicles.filter(v => v.isFleetVehicle).map(v => v.ownerName))).sort()}
        onSave={handleSaveWithdrawal}
      />
    </>
  );
}

export { RentasPageComponent };
