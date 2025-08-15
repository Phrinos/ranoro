// src/app/(app)/finanzas/components/caja-content.tsx
"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { DateRange } from "react-day-picker";
import type { SaleReceipt, ServiceRecord, CashDrawerTransaction, Payment, WorkshopInfo, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import { format, isValid, isSameDay, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, ShoppingCart, Wrench, Wallet, CreditCard, Send, LineChart, DollarSign, ArrowDown, ArrowUp, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { parseDate } from '@/lib/forms';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cashService, saleService, serviceService, inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { ServiceSheetContent } from '@/components/ServiceSheetContent';
import ReactDOMServer from 'react-dom/server';

const cashTransactionSchema = z.object({
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres."),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0."),
});
type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

// Extend the existing CashDrawerTransaction type for local use
type EnhancedCashDrawerTransaction = CashDrawerTransaction & {
    licensePlate?: string;
    fullConcept?: string;
};

interface CajaContentProps {
  allSales: SaleReceipt[];
  allServices: ServiceRecord[];
  cashTransactions: CashDrawerTransaction[];
}

export default function CajaContent({ allSales, allServices, cashTransactions }: CajaContentProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'Entrada' | 'Salida'>('Entrada');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SaleReceipt | ServiceRecord | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const serviceSheetContentRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
     if (storedWorkshopInfo) {
      try {
        setWorkshopInfo(JSON.parse(storedWorkshopInfo));
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
      }
    }
  }, []);
  
  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema),
  });

  const mergedCashMovements = useMemo(() => {
    const posCashMovements: EnhancedCashDrawerTransaction[] = allSales.reduce((acc, sale) => {
      if (sale.status === 'Cancelado') return acc;

      let cashAmount = 0;
      if (sale.payments && sale.payments.length > 0) {
        const cashPayment = sale.payments.find(p => p.method === 'Efectivo');
        cashAmount = cashPayment?.amount || 0;
      } else if (sale.amountInCash) {
        cashAmount = sale.amountInCash;
      }
      
      if (cashAmount > 0) {
        acc.push({
          id: `sale-${sale.id}`,
          date: sale.saleDate,
          type: 'Entrada',
          amount: cashAmount,
          concept: sale.id,
          fullConcept: sale.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ') || 'Venta de mostrador',
          userId: sale.registeredById || 'system',
          userName: sale.registeredByName || 'Sistema',
          relatedId: sale.id,
          relatedType: 'Venta',
        });
      }
      return acc;
    }, [] as EnhancedCashDrawerTransaction[]);

    const serviceCashMovements: EnhancedCashDrawerTransaction[] = allServices.reduce((acc, service) => {
      const relevantStatus = service.status === 'Entregado' || service.status === 'Completado';
      if (!relevantStatus) return acc;
      
      let cashAmount = 0;
      if (service.payments && service.payments.length > 0) {
        const cashPayment = service.payments.find(p => p.method === 'Efectivo');
        cashAmount = cashPayment?.amount || 0;
      } else if (service.amountInCash) {
        cashAmount = service.amountInCash;
      }

      if (cashAmount > 0) {
        const serviceItemsConcept = service.serviceItems?.map(i => i.name).join(', ');
        acc.push({
          id: `service-${service.id}`,
          date: service.deliveryDateTime!,
          type: 'Entrada',
          amount: cashAmount,
          concept: service.id,
          fullConcept: serviceItemsConcept || service.description || 'Servicio General',
          userId: service.serviceAdvisorId || 'system',
          userName: service.serviceAdvisorName || 'Asesor no asignado',
          relatedId: service.id,
          relatedType: 'Servicio',
          licensePlate: service.vehicleIdentifier || 'N/A',
        });
      }
      return acc;
    }, [] as EnhancedCashDrawerTransaction[]);
        
    const enhancedManualTransactions: EnhancedCashDrawerTransaction[] = cashTransactions.map(t => ({
        ...t,
        id: t.id, // The original object already has the ID
        concept: t.id, // For the ID column
        fullConcept: t.concept, // For the descriptive concept column
    }));

    return [...posCashMovements, ...serviceCashMovements, ...enhancedManualTransactions]
      .sort((a,b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
  }, [allSales, allServices, cashTransactions]);


  const periodData = useMemo(() => {
    if (!dateRange?.from) {
      return { movements: [], totalIn: 0, totalOut: 0, netBalance: 0 };
    }
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : from;

    const movements = mergedCashMovements.filter(m => {
        const mDate = parseDate(m.date);
        return mDate && isValid(mDate) && isWithinInterval(mDate, { start: from, end: to });
    });

    let totalIn = 0;
    let totalOut = 0;

    movements.forEach(m => {
      if (m.type === 'Entrada') {
        totalIn += m.amount;
      } else if (m.type === 'Salida') {
        totalOut += m.amount;
      }
    });

    return { movements, totalIn, totalOut, netBalance: totalIn - totalOut };
  }, [mergedCashMovements, dateRange]);


  const handleOpenDialog = (type: 'Entrada' | 'Salida') => {
    setDialogType(type);
    form.reset();
    setIsDialogOpen(true);
  };
  
  const handleRowClick = async (movement: EnhancedCashDrawerTransaction) => {
    if (!movement.relatedId || !movement.relatedType) return;
    
    setIsLoadingDocument(true);
    setSelectedVehicle(null);
    try {
      let docData;
      if (movement.relatedType === 'Venta') {
        docData = await saleService.getDocById('saleReceipts', movement.relatedId);
        setSelectedDocument(docData);
      } else if (movement.relatedType === 'Servicio') {
        docData = await serviceService.getDocById('serviceRecords', movement.relatedId) as ServiceRecord;
        if (docData && docData.vehicleId) {
            const vehicleData = await inventoryService.getVehicleById(docData.vehicleId);
            setSelectedVehicle(vehicleData);
        }
        setSelectedDocument(docData);
      }
      
      if (docData) {
        setIsPreviewOpen(true);
      } else {
        toast({ title: "No encontrado", description: "No se pudo encontrar el documento asociado.", variant: "warning" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Hubo un problema al cargar el documento.", variant: "destructive" });
      console.error(error);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleTransactionSubmit = async (values: CashTransactionFormValues) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    try {
        await cashService.addCashTransaction({
            type: dialogType,
            amount: values.amount,
            concept: values.concept,
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || 'Sistema',
        });
        toast({ title: `Se registró una ${dialogType.toLowerCase()} de caja.` });
        setIsDialogOpen(false);
    } catch(e) {
        toast({ title: 'Error', description: 'No se pudo registrar la transacción.', variant: 'destructive'});
    }
  }
  
  const setPresetRange = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    switch (preset) {
        case 'today':
            setDateRange({ from: startOfDay(now), to: endOfDay(now) });
            break;
        case 'yesterday':
            const yesterday = subDays(now, 1);
            setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
            break;
        case 'week':
            setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
            break;
        case 'month':
            setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
            break;
    }
  };

  const renderPreviewContent = () => {
    if (!selectedDocument) return '';

    if ('saleDate' in selectedDocument) { // It's a SaleReceipt
        return ReactDOMServer.renderToString(
            <TicketContent
                ref={ticketContentRef}
                sale={selectedDocument as SaleReceipt}
                previewWorkshopInfo={workshopInfo || undefined}
            />
        );
    } else { // It's a ServiceRecord
        const service = selectedDocument as ServiceRecord;
        const adaptedRecord = {
          id: service.id,
          status: service.status === 'En Taller' ? 'EN_TALLER' : service.status === 'Entregado' ? 'ENTREGADO' : 'AGENDADO',
          serviceDate: service.serviceDate,
          appointmentDate: service.appointmentDateTime,
          isPublicView: false,
          vehicle: {
            label: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.year}` : 'Vehículo',
            plates: selectedVehicle?.licensePlate,
          },
          customerName: service.customerName,
          workshopInfo: workshopInfo,
          serviceAdvisorName: service.serviceAdvisorName,
          serviceAdvisorSignatureDataUrl: service.serviceAdvisorSignatureDataUrl,
          serviceItems: service.serviceItems,
          reception: {
            at: service.receptionDateTime,
            customerSignatureDataUrl: service.customerSignatureReception,
          },
          delivery: {
            at: service.deliveryDateTime,
            customerSignatureDataUrl: service.customerSignatureDelivery,
          },
          securityChecklist: [],
        };
        return ReactDOMServer.renderToString(
            <ServiceSheetContent record={adaptedRecord} />
        );
    }
  };


  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Caja</h2>
             <div className="flex gap-2 items-center flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setPresetRange('today')} className="bg-card">Hoy</Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('yesterday')} className="bg-card">Ayer</Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('week')} className="bg-card">Semana</Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('month')} className="bg-card">Mes</Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-[280px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                            `${format(dateRange.from, "LLL dd, y", {locale: es})} - ${format(dateRange.to, "LLL dd, y", {locale: es})}`
                        ) : (
                            format(dateRange.from, "LLL dd, y", {locale: es})
                        )
                    ) : (
                        <span>Seleccione rango</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus locale={es}/>
                </PopoverContent>
              </Popover>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-green-600">Entradas Totales</CardTitle><ArrowUp className="h-4 w-4 text-green-500"/></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(periodData.totalIn)}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-600">Salidas Totales</CardTitle><ArrowDown className="h-4 w-4 text-red-500"/></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(periodData.totalOut)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance del Periodo</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(periodData.netBalance)}</div></CardContent>
            </Card>
        </div>
        <div className="flex justify-end gap-2">
            <Button onClick={() => handleOpenDialog('Entrada')} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 bg-card">
                <ArrowUp className="mr-2 h-4 w-4"/> Registrar Entrada
            </Button>
            <Button onClick={() => handleOpenDialog('Salida')} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 bg-card">
                <ArrowDown className="mr-2 h-4 w-4"/> Registrar Salida
            </Button>
        </div>
        
        <Card>
            <CardHeader><CardTitle>Movimientos de Caja del Periodo</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>ID Movimiento</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingDocument && <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mr-2 h-5 w-5 animate-spin inline-block" /> Cargando documento...</TableCell></TableRow>}
                            {!isLoadingDocument && periodData.movements.length > 0 ? (
                                periodData.movements.map((m: EnhancedCashDrawerTransaction) => (
                                    <TableRow 
                                        key={m.id}
                                        onClick={() => handleRowClick(m)}
                                        className={m.relatedId ? "cursor-pointer hover:bg-muted/50" : ""}
                                    >
                                        <TableCell>{m.date && isValid(parseDate(m.date)!) ? format(parseDate(m.date)!, "dd MMM, HH:mm", { locale: es }) : 'N/A'}</TableCell>
                                        <TableCell>
                                          <Badge variant={m.type === 'Entrada' ? 'success' : 'destructive'}>{m.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{m.relatedType || 'Manual'}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{m.concept}</TableCell>
                                        <TableCell className="max-w-[250px] truncate">{m.fullConcept}</TableCell>
                                        <TableCell>{m.userName}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(m.amount)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                !isLoadingDocument && <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron movimientos de caja para este periodo.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar {dialogType} de Caja</DialogTitle>
                    <DialogDescription>Añade un concepto y monto para registrar el movimiento.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleTransactionSubmit)} id="cash-transaction-form" className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="concept"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Concepto</FormLabel>
                                <FormControl>
                                    <Textarea placeholder={dialogType === 'Entrada' ? 'Ej: Fondo inicial' : 'Ej: Compra de papelería'} {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Monto</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-8"/>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" form="cash-transaction-form" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Guardando...' : `Registrar ${dialogType}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {selectedDocument && (
          <UnifiedPreviewDialog
            open={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            title={`Vista Previa - ${'saleDate' in selectedDocument ? 'Venta' : 'Servicio'}`}
            documentType={'saleDate' in selectedDocument ? 'text' : 'html'}
            textContent={renderPreviewContent()}
          />
        )}
    </div>
  );
}
