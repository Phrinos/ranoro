"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useTableManager } from '@/hooks/useTableManager';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction, Vehicle, DailyRentalCharge, ManualDebtEntry } from '@/types';
import { OwnerWithdrawalDialog } from './OwnerWithdrawalDialog';
import { VehicleExpenseDialog } from './VehicleExpenseDialog';
import { rentalService } from '@/lib/services/rental.service';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  TrendingDown, 
  Wrench, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Tag, 
  CreditCard, 
  FileText,
  DollarSign 
} from 'lucide-react';
import { exportToCsv } from '@/lib/services/export.service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface DetallesReporteTabProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  cashTransactions: CashDrawerTransaction[];
  vehicles: Vehicle[];
  dailyCharges: DailyRentalCharge[];
  manualDebts: ManualDebtEntry[];
}

type ReportRow = {
  id: string;
  date: Date | null;
  type: 'Ingreso' | 'Egreso';
  source: string;
  concept: string;
  amount: number;
  method: string;
  responsible: string;
  note?: string;
  vehiclePlate?: string;
};

export default function DetallesReporteTab({ 
  payments, 
  expenses, 
  withdrawals, 
  cashTransactions, 
  vehicles,
  dailyCharges,
  manualDebts 
}: DetallesReporteTabProps) {
  const { toast } = useToast();
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<ReportRow | null>(null);

  const merged = useMemo(() => {
    const rows: ReportRow[] = [];
    
    // Pagos de renta
    payments.forEach(p => rows.push({ 
      id: `p-${p.id}`, 
      date: parseDate(p.paymentDate || p.date), 
      type: 'Ingreso', 
      source: 'Pago Renta', 
      concept: `Abono: ${p.driverName || 'Chofer'} (${p.vehicleLicensePlate})`, 
      amount: p.amount, 
      method: p.paymentMethod || 'Efectivo', 
      responsible: p.registeredByName || 'Sistema',
      note: p.note,
      vehiclePlate: p.vehicleLicensePlate
    }));

    // Gastos de unidad
    expenses.forEach(e => rows.push({ 
      id: `e-${e.id}`, 
      date: parseDate(e.date), 
      type: 'Egreso', 
      source: 'Gasto Unidad', 
      concept: `${e.description} (${e.vehicleLicensePlate})`, 
      amount: e.amount, 
      method: 'Efectivo', 
      responsible: 'Sistema',
      note: e.description,
      vehiclePlate: e.vehicleLicensePlate
    }));

    // Retiros de socios
    withdrawals.forEach(w => rows.push({ 
      id: `w-${w.id}`, 
      date: parseDate(w.date), 
      type: 'Egreso', 
      source: 'Retiro Socio', 
      concept: `Retiro: ${w.ownerName}`, 
      amount: w.amount, 
      method: 'Efectivo', 
      responsible: 'Sistema',
      note: w.note
    }));

    // Cargos de renta diarios (Automáticos)
    dailyCharges.forEach(c => rows.push({
      id: `c-${c.id}`, 
      date: parseDate(c.date), 
      type: 'Egreso', 
      source: 'Cargo Renta', 
      concept: `Renta Diaria: ${c.vehicleLicensePlate}`, 
      amount: c.amount, 
      method: 'Saldo', 
      responsible: 'Sistema',
      note: (c as any).note,
      vehiclePlate: c.vehicleLicensePlate
    }));

    // Adeudos manuales
    manualDebts.forEach(d => rows.push({
      id: `d-${d.id}`, 
      date: parseDate(d.date), 
      type: 'Egreso', 
      source: 'Cargo Manual', 
      concept: `${d.note || d.reason}`, 
      amount: d.amount, 
      method: 'Saldo', 
      responsible: 'Sistema',
      note: d.note || d.reason
    }));

    return rows;
  }, [payments, expenses, withdrawals, dailyCharges, manualDebts]);

  const { filteredData, ...tableManager } = useTableManager({
    initialData: merged,
    searchKeys: ['concept', 'responsible', 'source', 'note'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    itemsPerPage: 50
  });

  const handleExport = () => {
    exportToCsv({
      data: filteredData,
      headers: [
        { key: 'date', label: 'Fecha' },
        { key: 'type', label: 'Tipo' },
        { key: 'source', label: 'Origen' },
        { key: 'concept', label: 'Concepto' },
        { key: 'amount', label: 'Monto' },
        { key: 'method', label: 'Método' },
        { key: 'responsible', label: 'Responsable' }
      ],
      fileName: 'reporte_detallado_flotilla'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsWithdrawalOpen(true)} className="border-red-500 text-red-600 hover:bg-red-50 bg-card">
            <TrendingDown className="mr-2 h-4 w-4" /> Registrar Retiro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsExpenseOpen(true)} className="border-orange-500 text-orange-600 hover:bg-orange-50 bg-card">
            <Wrench className="mr-2 h-4 w-4" /> Registrar Gasto
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <DatePickerWithRange date={tableManager.dateRange} onDateChange={tableManager.onDateRangeChange} />
          <Button variant="outline" size="icon" onClick={handleExport} title="Descargar CSV" className="bg-card">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por concepto, origen o responsable..."
              className="pl-8 bg-card"
              value={tableManager.searchTerm}
              onChange={(e) => tableManager.onSearchTermChange(e.target.value)}
            />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <SortableTableHeader sortKey="date" label="Fecha" onSort={k => tableManager.onSortOptionChange(`${k}_${tableManager.sortOption.endsWith('asc') ? 'desc' : 'asc'}`)} currentSort={tableManager.sortOption} textClassName="text-white" />
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">Origen</TableHead>
                  <TableHead className="text-white">Concepto</TableHead>
                  <TableHead className="text-white text-right">Monto</TableHead>
                  <TableHead className="text-white">Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? filteredData.map(row => (
                  <TableRow 
                    key={row.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedMovement(row)}
                  >
                    <TableCell className="text-xs">{row.date ? format(row.date, 'dd/MM/yy HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={row.type === 'Ingreso' ? 'success' : 'destructive'}>{row.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{row.source}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-medium text-xs" title={row.concept}>{row.concept}</TableCell>
                    <TableCell className={cn("text-right font-bold", row.type === 'Ingreso' ? 'text-green-600' : 'text-red-600')}>
                      {row.type === 'Ingreso' ? '+' : '-'} {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{row.method}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No se encontraron movimientos en este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {tableManager.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">{tableManager.paginationSummary}</p>
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={tableManager.goToPreviousPage} disabled={!tableManager.canGoPrevious} variant="outline" className="bg-card">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button size="sm" onClick={tableManager.goToNextPage} disabled={!tableManager.canGoNext} variant="outline" className="bg-card">
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      <Dialog open={!!selectedMovement} onOpenChange={(open) => !open && setSelectedMovement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Detalle de Movimiento
            </DialogTitle>
            <DialogDescription>Información registrada en el sistema de flotilla.</DialogDescription>
          </DialogHeader>
          
          {selectedMovement && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Fecha y Hora</p>
                  <p className="text-sm font-medium">{selectedMovement.date ? format(selectedMovement.date, "dd 'de' MMMM, yyyy HH:mm", { locale: es }) : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3"/> Origen</p>
                  <p className="text-sm font-medium">{selectedMovement.source}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Concepto</p>
                <p className="text-sm font-semibold">{selectedMovement.concept}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3"/> Método</p>
                  <Badge variant={selectedMovement.type === 'Ingreso' ? 'success' : 'destructive'} className="mt-1">
                    {selectedMovement.method}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Monto</p>
                  <p className={cn("text-lg font-bold", selectedMovement.type === 'Ingreso' ? "text-green-600" : "text-red-600")}>
                    {selectedMovement.type === 'Ingreso' ? '+' : '-'} {formatCurrency(selectedMovement.amount)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><UserIcon className="h-3 w-3"/> Registrado por</p>
                  <p className="text-sm font-medium">{selectedMovement.responsible}</p>
                </div>
                {selectedMovement.vehiclePlate && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Vehículo</p>
                    <p className="text-sm font-medium font-mono">{selectedMovement.vehiclePlate}</p>
                  </div>
                )}
              </div>

              {selectedMovement.note && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3"/> Notas Adicionales</p>
                  <div className="p-3 bg-muted/50 rounded-md text-sm italic">
                    {selectedMovement.note}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedMovement(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OwnerWithdrawalDialog 
        open={isWithdrawalOpen} 
        onOpenChange={setIsWithdrawalOpen} 
        owners={Array.from(new Set(vehicles.map(v => v.ownerName).filter(Boolean))) as string[]}
        onSave={async data => { await rentalService.addOwnerWithdrawal(data); setIsWithdrawalOpen(false); toast({ title: 'Retiro guardado' }); }}
      />
      <VehicleExpenseDialog
        open={isExpenseOpen}
        onOpenChange={setIsExpenseOpen}
        vehicles={vehicles.filter(v => v.isFleetVehicle)}
        onSave={async data => { await rentalService.addVehicleExpense(data); setIsExpenseOpen(false); toast({ title: 'Gasto guardado' }); }}
      />
    </div>
  );
}
