"use client";

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

  const monthlyTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );

  const handleSaveExpense = async (values: FixedExpenseFormValues) => {
    if (!db) return;
    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'fixedMonthlyExpenses', editingExpense.id), values as any);
        const updated = expenses.map(e => e.id === editingExpense.id ? { ...e, ...values } : e);
        setExpenses(updated);
        onExpensesUpdated(updated);
        toast({ title: 'Gasto actualizado' });
      } else {
        const docRef = await addDoc(collection(db, 'fixedMonthlyExpenses'), { ...values, createdAt: new Date().toISOString() });
        const updated = [...expenses, { id: docRef.id, ...values } as MonthlyFixedExpense];
        setExpenses(updated);
        onExpensesUpdated(updated);
        toast({ title: 'Gasto agregado' });
      }
      setIsSubFormOpen(false);
    } catch (e) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'fixedMonthlyExpenses', id));
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
      onExpensesUpdated(updated);
      toast({ title: 'Gasto eliminado' });
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Gestionar Gastos Fijos</DialogTitle>
          <DialogDescription>Añade o edita los gastos recurrentes del taller.</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-4">
          {isSubFormOpen ? (
            <FixedExpenseForm
              initialData={editingExpense}
              onSubmit={handleSaveExpense}
              onClose={() => setIsSubFormOpen(false)}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button onClick={() => { setEditingExpense(null); setIsSubFormOpen(true); }} size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Gasto
                </Button>
                <div className="text-sm font-semibold">Total: {formatCurrency(monthlyTotal)}</div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingExpense(e); setIsSubFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <ConfirmDialog
                            triggerButton={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                            title="¿Eliminar gasto?"
                            description="Esta acción es permanente."
                            onConfirm={() => handleDeleteExpense(e.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}