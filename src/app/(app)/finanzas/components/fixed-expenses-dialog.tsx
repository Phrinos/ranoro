// src/app/(app)/finanzas/components/fixed-expenses-dialog.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { FixedExpenseForm, type FixedExpenseFormValues } from './fixed-expense-form';
import type { MonthlyFixedExpense } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';

interface FixedExpensesDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExpensesUpdated: (updatedExpenses: MonthlyFixedExpense[]) => void;
  initialExpenses: MonthlyFixedExpense[];
}

const categoryOrder: Record<string, number> = {
  'Renta': 1,
  'Servicios': 2,
  'Otros': 3,
};

export function FixedExpensesDialog({
  open,
  onOpenChange,
  onExpensesUpdated,
  initialExpenses,
}: FixedExpensesDialogProps) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<MonthlyFixedExpense[]>(initialExpenses);
  const [isSubFormOpen, setIsSubFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyFixedExpense | null>(null);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const orderA = categoryOrder[a.category || 'Otros'] ?? 99;
      const orderB = categoryOrder[b.category || 'Otros'] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = (a.name || '').toString();
      const nameB = (b.name || '').toString();
      return nameA.localeCompare(nameB, 'es', { numeric: true });
    });
  }, [expenses]);

  const monthlyTotal = useMemo(
    () => sortedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [sortedExpenses]
  );

  const handleOpenSubForm = (expense?: MonthlyFixedExpense) => {
    setEditingExpense(expense || null);
    setIsSubFormOpen(true);
  };

  const handleSaveExpense = async (values: FixedExpenseFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive' });

    const cleanedName = values.name.trim();
    const roundedAmount = Math.round(Number(values.amount) * 100) / 100;

    const dataToSave: any = {
      name: cleanedName,
      amount: roundedAmount,
      notes: values.notes || '',
      category: values.category,
    };

    try {
      if (editingExpense) {
        // UPDATE
        await updateDoc(doc(db, 'fixedMonthlyExpenses', editingExpense.id), dataToSave);

        const updatedList = expenses.map((e) =>
          e.id === editingExpense.id ? { ...e, ...dataToSave } : e
        );
        setExpenses(updatedList);
        onExpensesUpdated(updatedList);

        toast({ title: 'Gasto actualizado' });
      } else {
        // CREATE
        dataToSave.createdAt = new Date().toISOString();
        const ref = await addDoc(collection(db, 'fixedMonthlyExpenses'), dataToSave);

        const newExpense: MonthlyFixedExpense = {
          id: ref.id,
          ...dataToSave,
        };

        const updatedList = [...expenses, newExpense];
        setExpenses(updatedList);
        onExpensesUpdated(updatedList);

        toast({ title: 'Gasto agregado' });
      }

      setIsSubFormOpen(false);
      setEditingExpense(null);
    } catch (e) {
      console.error('Error saving fixed expense:', e);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive' });
    try {
      await deleteDoc(doc(db, 'fixedMonthlyExpenses', expenseId));
      const updatedList = expenses.filter((e) => e.id !== expenseId);
      setExpenses(updatedList);
      onExpensesUpdated(updatedList);

      toast({ title: 'Gasto eliminado' });
    } catch (e) {
      console.error('Error deleting fixed expense:', e);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Gestionar Gastos Fijos Mensuales</DialogTitle>
          <DialogDescription>
            Añade, edita o elimina los gastos fijos recurrentes de tu taller.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6">
          {isSubFormOpen ? (
            <div className="py-4">
              <FixedExpenseForm
                initialData={editingExpense}
                onSubmit={handleSaveExpense}
                onClose={() => {
                  setIsSubFormOpen(false);
                  setEditingExpense(null);
                }}
              />
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button onClick={() => handleOpenSubForm()} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Gasto
                </Button>

                <div className="ml-auto text-sm text-muted-foreground">
                  Total mensual configurado:&nbsp;
                  <span className="font-semibold text-foreground">
                    {formatCurrency(monthlyTotal)}
                  </span>
                </div>
              </div>

              {sortedExpenses.length > 0 ? (
                <ScrollArea className="h-[400px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre del Gasto</TableHead>
                        <TableHead className="text-right">Monto Mensual</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">
                            <p>{expense.name}</p>
                            <Badge variant="outline" className="mt-1">
                              {expense.category || 'Otros'}
                            </Badge>
                            {(expense as any).notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {(expense as any).notes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(expense.amount) || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenSubForm(expense)}
                              className="mr-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <ConfirmDialog
                              triggerButton={
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              }
                              title={`¿Eliminar gasto "${expense.name}"?`}
                              description="Esta acción es permanente y afectará los cálculos financieros."
                              onConfirm={async () => await handleDeleteExpense(expense.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No hay gastos fijos registrados.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Tip: al crear un gasto nuevo se registra <code>createdAt</code> con la fecha actual.
                El Estado de Resultados sólo considera gastos activos hasta la fecha final del
                periodo.
              </p>
            </div>
          )}
        </div>

        {!isSubFormOpen && (
          <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
