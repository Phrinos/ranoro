
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getPaymentMethodVariant, capitalizeWords } from '@/lib/utils';
import type { SaleReceipt, InventoryItem, User } from '@/types';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { User as UserIcon, TrendingUp, Wallet, CreditCard, Send, ShoppingCart, Tags, AlertCircle } from 'lucide-react';

const IVA_RATE = 0.16;

const paymentMethodIcons: Record<string, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};


interface PosFormViewProps {
  sale: SaleReceipt;
  inventory: InventoryItem[];
  users: User[];
}

export function PosFormView({ sale, inventory, users }: PosFormViewProps) {
  const isCancelled = sale.status === 'Cancelado';
  const profit = useMemo(() => calculateSaleProfit(sale, inventory), [sale, inventory]);
  const sellerName = useMemo(() => {
    if (sale.registeredByName) return sale.registeredByName;
    if (sale.registeredById) {
      const seller = users.find(u => u.id === sale.registeredById);
      return seller?.name || 'Usuario no disponible';
    }
    return 'Usuario no disponible';
  }, [sale, users]);

  const totalPaid = sale.payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || sale.totalAmount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Columna Izquierda: Lista de Artículos */}
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>Artículos y Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nombre del Cliente</Label>
                        <Input readOnly value={sale.customerName || 'Cliente Mostrador'} className="bg-muted"/>
                    </div>
                    {isCancelled && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Venta Cancelada</AlertTitle>
                            <AlertDescription>
                                {sale.cancellationReason && `Motivo: ${sale.cancellationReason}`}
                                <br/>
                                {sale.cancelledBy && `Cancelado por: ${sale.cancelledBy}`}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        {sale.items.length > 0 ? (
                            sale.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                                    <div>
                                        <p className="font-medium">{item.itemName}</p>
                                        <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                                    </div>
                                    <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground p-4">No hay artículos en esta venta.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Columna Derecha: Pago y Resumen */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Resumen de Venta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Vendedor:</span><span>{sellerName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Ganancia Bruta:</span><span className="font-medium text-green-600 flex items-center gap-1"><TrendingUp className="h-4 w-4"/> {formatCurrency(profit)}</span></div>
                    <hr className="my-2"/>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>{formatCurrency(sale.subTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IVA ({IVA_RATE * 100}%):</span><span>{formatCurrency(sale.tax)}</span></div>
                    <div className="flex justify-between text-base font-bold"><span className="text-foreground">Total de Venta:</span><span className="text-primary">{formatCurrency(sale.totalAmount)}</span></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(sale.payments && sale.payments.length > 0) ? (
                        sale.payments.map((p, index) => {
                            const Icon = paymentMethodIcons[p.method] || Wallet;
                            return (
                                <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2"><Icon className="h-4 w-4"/><span>{p.method}</span></div>
                                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                                    </div>
                                    {p.folio && <div className="text-xs text-muted-foreground">Folio: {p.folio}</div>}
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center text-muted-foreground p-4">No hay detalles de pago.</div>
                    )}
                     <div className="flex justify-end font-semibold pt-2 border-t">
                        Total Pagado: {formatCurrency(totalPaid)}
                     </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
