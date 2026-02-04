
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useTableManager } from '@/hooks/useTableManager';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, CashDrawerTransaction, Vehicle } from '@/types';
import { OwnerWithdrawalDialog } from './OwnerWithdrawalDialog';
import { VehicleExpenseDialog } from './VehicleExpenseDialog';
import { rentalService } from '@/lib/services/rental.service';
import { useToast } from '@/hooks/use-toast';
import { Search, TrendingDown, Wrench, Download } from 'lucide-react';
import { exportToCsv } from '@/lib/services/export.service';

interface DetallesReporteTabProps {
  payments: RentalPayment[];
  expenses: VehicleExpense[];
  withdrawals: OwnerWithdrawal[];
  cashTransactions: CashDrawerTransaction[];
  vehicles: Vehicle[];
}

export default function DetallesReporteTab({ payments, expenses, withdrawals, cashTransactions, vehicles }: DetallesReporteTabProps) {
  const { toast } = useToast();
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  const merged = useMemo(() => {
    const rows: any[] = [];
    payments.forEach(p => rows.push({ 
      id: `p-${p.id}`, date: parseDate(p.paymentDate || p.date), type: 'Ingreso', source: 'Pago Renta', 
      concept: `Renta: ${p.driverName || 'Chofer'} (${p.vehicleLicensePlate})`, amount: p.amount, method: p.paymentMethod || 'Efectivo', responsible: p.registeredByName || 'Sistema' 
    }));
    expenses.forEach(e => rows.push({ 
      id: `e-${e.id}`, date: parseDate(e.date), type: 'Egreso', source: 'Gasto Unidad', 
      concept: `${e.description} (${e.vehicleLicensePlate})`, amount: e.amount, method: 'Efectivo', responsible: 'Sistema' 
    }));
    withdrawals.forEach(w => rows.push({ 
      id: `w-${w.id}`, date: parseDate(w.date), type: 'Egreso', source: 'Retiro Socio', 
      concept: `Retiro: ${w.ownerName}`, amount: w.amount, method: 'Efectivo', responsible: 'Sistema' 
    }));
    return rows;
  }, [payments, expenses, withdrawals]);

  const { filteredData, ...tableManager } = useTableManager({
    initialData: merged,
    searchKeys: ['concept', 'responsible'],
    dateFilterKey: 'date',
    initialSortOption: 'date_desc',
    initialDateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) }
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
        { key: 'method', label: 'Método' }
      ],
      fileName: 'reporte_detallado_flotilla'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsWithdrawalOpen(true)} className="border-red-500 text-red-600 hover:bg-red-50">
            <TrendingDown className="mr-2 h-4 w-4" /> Registrar Retiro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsExpenseOpen(true)} className="border-orange-500 text-orange-600 hover:bg-orange-50">
            <Wrench className="mr-2 h-4 w-4" /> Registrar Gasto
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <DatePickerWithRange date={tableManager.dateRange} onDateChange={tableManager.onDateRangeChange} />
          <Button variant="outline" size="icon" onClick={handleExport} title="Descargar CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por concepto o responsable..."
              className="pl-8"
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
                  <TableHead className="text-white">Concepto</TableHead>
                  <TableHead className="text-white text-right">Monto</TableHead>
                  <TableHead className="text-white">Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date ? format(row.date, 'dd/MM/yy HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={row.type === 'Ingreso' ? 'success' : 'destructive'}>{row.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{row.concept}</TableCell>
                    <TableCell className={cn("text-right font-bold", row.type === 'Ingreso' ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-xs">{row.method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
