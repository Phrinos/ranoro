
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getInvoices, cancelInvoice as cancelInvoiceFlow } from '@/ai/flows/billing-flow';
import type { Invoice } from 'facturapi';
import { Loader2, FileDown, Ban, RefreshCw, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type { WorkshopInfo } from '@/types';

export function HistorialContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const result = await getInvoices();
        if (result.error) {
            setError(result.error);
            setInvoices([]);
        } else {
            setInvoices(result.data);
        }
    } catch (e: any) {
        setError(e.message || 'Error al cargar las facturas.');
        setInvoices([]);
        toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
        const result = await cancelInvoiceFlow(invoiceId);
        if(result.success) {
            toast({ title: "Factura Cancelada", description: "La factura ha sido cancelada exitosamente." });
            fetchInvoices(); // Refresh the list
        } else {
            throw new Error(result.error || 'Error desconocido al cancelar');
        }
    } catch (e: any) {
        toast({ title: "Error al Cancelar", description: e.message, variant: "destructive" });
    }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
        case 'valid': return 'success';
        case 'canceled': return 'destructive';
        case 'draft': return 'outline';
        default: return 'secondary';
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
        case 'valid': return 'Vigente';
        case 'canceled': return 'Cancelada';
        case 'draft': return 'Borrador';
        default: return status;
    }
  }

  if (isLoading) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="mt-4">Cargando historial de facturas...</p>
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center text-destructive">
                <AlertCircle className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">Ocurrió un Error</h3>
                <p className="text-sm mt-1">{error}</p>
                <Button onClick={fetchInvoices} className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Historial de Facturas Emitidas</CardTitle>
            <CardDescription>Consulta todas las facturas que han sido generadas a través del sistema.</CardDescription>
        </div>
        <Button onClick={fetchInvoices} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
            Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-black">
              <TableRow>
                <TableHead className="text-white">Fecha</TableHead>
                <TableHead className="text-white">Folio</TableHead>
                <TableHead className="text-white">Cliente</TableHead>
                <TableHead className="text-white">RFC</TableHead>
                <TableHead className="text-right text-white">Total</TableHead>
                <TableHead className="text-center text-white">Estado</TableHead>
                <TableHead className="text-right text-white">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell>{format(parseISO(invoice.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell className="font-mono">{invoice.folio_number}</TableCell>
                    <TableCell>{invoice.customer.legal_name}</TableCell>
                    <TableCell>{invoice.customer.tax_id}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="text-center"><Badge variant={getStatusVariant(invoice.status)}>{getStatusLabel(invoice.status)}</Badge></TableCell>
                    <TableCell className="text-right">
                       {invoice.pdf_url && <Button variant="ghost" size="icon" asChild><a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer"><FileDown className="h-4 w-4"/></a></Button>}
                       {invoice.status === 'valid' && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Ban className="h-4 w-4 text-destructive"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Cancelar Factura?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        ¿Seguro que quieres cancelar la factura con folio {invoice.folio_number}? Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancelInvoice(invoice.id)} className="bg-destructive hover:bg-destructive/90">Sí, Cancelar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">No se encontraron facturas.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
