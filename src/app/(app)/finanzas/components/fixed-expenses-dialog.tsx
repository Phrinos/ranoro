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
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
      const orderA = categoryOrder[a.category || 'Otros'] || 99;
      const orderB = categoryOrder[b.category || 'Otros'] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [expenses]);


  const handleOpenSubForm = (expense?: MonthlyFixedExpense) => {
    setEditingExpense(expense || null);
    setIsSubFormOpen(true);
  };

  const handleSaveExpense = async (values: FixedExpenseFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive' });
    const dataToSave: Partial<MonthlyFixedExpense> = { 
        name: values.name, 
        amount: Number(values.amount), 
        notes: values.notes || '',
        category: values.category,
    };
    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'fixedMonthlyExpenses', editingExpense.id), dataToSave);
        toast({ title: 'Gasto Actualizado' });
      } else {
        // Add creation date for new expenses
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'fixedMonthlyExpenses'), dataToSave);
        toast({ title: 'Gasto Agregado' });
      }
      setIsSubFormOpen(false);
      setEditingExpense(null);
      // Parent will get update from Firestore listener
    } catch (e) {
      console.error('Error saving fixed expense:', e);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive' });
    try {
      await deleteDoc(doc(db, 'fixedMonthlyExpenses', expenseId));
      toast({ title: 'Gasto Eliminado' });
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
              <Button onClick={() => handleOpenSubForm()} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Gasto
              </Button>
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
                            <Badge variant="outline" className="mt-1">{expense.category || 'Otros'}</Badge>
                            {expense.notes && <p className="text-xs text-muted-foreground mt-1">{expense.notes}</p>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenSubForm(expense)} className="mr-1">
                              <Edit className="h-4 w-4" />
                            </Button>
                             <ConfirmDialog
                                triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                                title={`¿Eliminar gasto "${expense.name}"?`}
                                description="Esta acción es permanente y afectará los cálculos financieros."
                                onConfirm={() => handleDeleteExpense(expense.id)}
                              />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay gastos fijos registrados.</p>
              )}
            </div>
          )}
        </div>
        {!isSubFormOpen && (
           <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
             <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
           </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
