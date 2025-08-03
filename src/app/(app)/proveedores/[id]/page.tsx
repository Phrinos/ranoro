
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, getDocs, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Edit, DollarSign, Calendar as CalendarIcon, FileText, BadgePercent, Trash2 } from 'lucide-react';
import { SupplierDialog } from '../components/supplier-dialog';
import { formatCurrency } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { inventoryService, operationsService } from '@/lib/services';
import type { Supplier, PayableAccount, User } from '@/types';
import type { SupplierFormValues } from '@/schemas/supplier-form-schema';
import { PayableAccountDialog } from '../components/payable-account-dialog';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [accountsPayable, setAccountsPayable] = useState<PayableAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(null);

  useEffect(() => {
    if (!supplierId || !db) return;

    const unsubSupplier = onSnapshot(doc(db, "suppliers", supplierId), (doc) => {
      if (doc.exists()) {
        setSupplier({ id: doc.id, ...doc.data() } as Supplier);
      } else {
        setSupplier(null);
      }
      setIsLoading(false);
    });

    const q = query(collection(db, "payableAccounts"), where("supplierId", "==", supplierId));
    const unsubAccounts = onSnapshot(q, (snapshot) => {
        setAccountsPayable(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayableAccount)).sort((a, b) => parseISO(b.invoiceDate).getTime() - parseISO(a.invoiceDate).getTime()));
    });

    return () => {
      unsubSupplier();
      unsubAccounts();
    };
  }, [supplierId]);

  const handleSaveSupplier = async (data: SupplierFormValues) => {
    await inventoryService.saveSupplier(data, supplierId);
    toast({ title: 'Proveedor actualizado' });
    setIsEditDialogOpen(false);
  };
  
  const handleDeleteSupplier = async () => {
    if (!supplier) return;
    try {
        await inventoryService.deleteSupplier(supplier.id);
        toast({ title: "Proveedor Eliminado", description: `${supplier.name} ha sido eliminado.` });
        router.push('/proveedores');
    } catch (e) {
        toast({ title: "Error", description: "No se pudo eliminar el proveedor.", variant: "destructive" });
    }
  };

  const handleRegisterPayment = async (accountId: string, amount: number, paymentMethod: string, note?: string) => {
    try {
        const userString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        const user: User | null = userString ? JSON.parse(userString) : null;
        await operationsService.registerPayableAccountPayment(accountId, amount, paymentMethod, note, user);
        toast({ title: "Pago Registrado", description: "El pago se ha registrado correctamente." });
        setIsPaymentDialogOpen(false);
    } catch(e) {
        toast({ title: "Error", description: `No se pudo registrar el pago. ${e instanceof Error ? e.message : ''}`, variant: "destructive" });
    }
  };
  
  const handleOpenPaymentDialog = (account: PayableAccount) => {
    setSelectedAccount(account);
    setIsPaymentDialogOpen(true);
  };
  
  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!supplier) return <div>Proveedor no encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
        <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar Proveedor</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará permanentemente al proveedor "{supplier.name}" y todo su historial de cuentas. No se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive hover:bg-destructive/90">Sí, Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4"/>Editar Proveedor</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{supplier.name}</CardTitle>
          <CardDescription>{supplier.description || "Sin descripción"}</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <p><strong>Contacto:</strong> {supplier.contactPerson || 'N/A'}</p>
          <p><strong>Teléfono:</strong> {supplier.phone || 'N/A'}</p>
          <p><strong>Email:</strong> {supplier.email || 'N/A'}</p>
          <p className="md:col-span-2 lg:col-span-3"><strong>Dirección:</strong> {supplier.address || 'N/A'}</p>
          <p><strong>RFC:</strong> {supplier.rfc || 'N/A'}</p>
          <p><strong>Régimen Fiscal:</strong> {supplier.taxRegime || 'N/A'}</p>
          <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-300">DEUDA TOTAL</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-200">{formatCurrency(supplier.debtAmount)}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Cuentas por Pagar</CardTitle>
            <CardDescription>Historial de facturas a crédito y pagos realizados.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader className="bg-black text-white">
                        <TableRow>
                            <TableHead className="text-white">Folio Factura</TableHead>
                            <TableHead className="text-white">Fecha</TableHead>
                            <TableHead className="text-white">Vencimiento</TableHead>
                            <TableHead className="text-right text-white">Total</TableHead>
                            <TableHead className="text-right text-white">Pagado</TableHead>
                            <TableHead className="text-right text-white">Saldo</TableHead>
                            <TableHead className="text-center text-white">Estado</TableHead>
                            <TableHead className="text-right text-white">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountsPayable.length > 0 ? accountsPayable.map(acc => (
                        <TableRow key={acc.id}>
                            <TableCell>{acc.invoiceId}</TableCell>
                            <TableCell>{format(parseISO(acc.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{format(parseISO(acc.dueDate), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-right">{formatCurrency(acc.totalAmount)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(acc.paidAmount)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(acc.totalAmount - acc.paidAmount)}</TableCell>
                            <TableCell className="text-center"><Badge variant={acc.status === 'Pagado' ? 'success' : acc.status === 'Pagado Parcialmente' ? 'secondary' : 'destructive'}>{acc.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                {acc.status !== 'Pagado' && (
                                    <Button variant="outline" size="sm" onClick={() => handleOpenPaymentDialog(acc)}>Registrar Pago</Button>
                                )}
                            </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={8} className="h-24 text-center">No hay cuentas por pagar para este proveedor.</TableCell></TableRow>
                      )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      <SupplierDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        supplier={supplier}
        onSave={handleSaveSupplier}
      />
      
      {selectedAccount && (
        <PayableAccountDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            account={selectedAccount}
            onSave={handleRegisterPayment}
        />
      )}
    </div>
  );
}
