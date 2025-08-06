
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  calculateSaleProfit,
} from '@/lib/placeholder-data';
import type { SaleReceipt, InventoryItem, Payment } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Printer, TrendingUp, Ban, ShoppingCart, User as UserIcon } from 'lucide-react';
import { formatCurrency, getPaymentMethodVariant } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SaleCardProps {
    sale: SaleReceipt;
    inventoryItems: InventoryItem[];
    onViewSale: () => void;
    onReprintTicket: () => void;
}

export const SaleCard = React.memo(({
    sale,
    inventoryItems,
    onViewSale,
    onReprintTicket
}: SaleCardProps) => {

    const saleDate = parseDate(sale.saleDate);
    const profit = calculateSaleProfit(sale, inventoryItems);
    const isCancelled = sale.status === 'Cancelado';

    const firstItem = sale.items?.[0];
    const firstItemDetails = firstItem ? inventoryItems.find(i => i.id === firstItem.inventoryItemId) : null;
    const category = firstItemDetails?.category || 'Varios';

    return (
        <Card className={cn("shadow-sm overflow-hidden", isCancelled && "bg-muted/60 opacity-80")}>
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                    {/* Bloque 1: Fecha e ID */}
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-40 flex-shrink-0 bg-muted/50">
                        <p className="font-semibold text-lg text-foreground">{saleDate && isValid(saleDate) ? format(saleDate, "dd MMM", { locale: es }) : "N/A"}</p>
                        <p className="text-muted-foreground text-xs">{saleDate && isValid(saleDate) ? format(saleDate, "yyyy, HH:mm 'hrs'", { locale: es }) : "Hora inválida"}</p>
                        <p className="text-muted-foreground text-xs mt-1">{sale.id}</p>
                    </div>

                    {/* Bloque 2: Artículos y Cliente */}
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 border-y md:border-y-0 md:border-x">
                       <div className="flex items-center gap-2 text-muted-foreground">
                          <ShoppingCart className="h-4 w-4" />
                           <Badge variant="outline">{category}</Badge>
                       </div>
                       <div className="font-bold text-black text-base">
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="truncate">{sale.items.map(i => i.itemName).join(', ')}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {sale.items.map(i => <p key={i.inventoryItemId}>{i.quantity} x {i.itemName}</p>)}
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                       </div>
                       <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <UserIcon className="h-3 w-3" />
                            <span>{sale.customerName || 'Cliente Mostrador'}</span>
                       </div>
                    </div>

                    {/* Bloque 3: Total y Ganancia */}
                    <div className="p-3 flex flex-col justify-center items-center md:items-end md:w-40 text-center md:text-right">
                       <p className="font-bold text-xl text-primary">{formatCurrency(sale.totalAmount)}</p>
                       <p className="text-sm text-green-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" /> {formatCurrency(profit)}
                       </p>
                    </div>

                    {/* Bloque 4 & 5: Pagos, Acciones y Usuario */}
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-56 flex-shrink-0 space-y-2">
                         <div className="flex flex-wrap gap-1 justify-center">
                            {isCancelled ? (
                                <Badge variant="destructive" className="font-bold">CANCELADO</Badge>
                            ) : sale.payments && sale.payments.length > 0 ? (
                                sale.payments.map((p, index) => (
                                    <Badge key={index} variant={getPaymentMethodVariant(p.method)} className="text-xs">
                                        {formatCurrency(p.amount)} <span className="font-normal ml-1 opacity-80">({p.method})</span>
                                    </Badge>
                                ))
                            ) : (
                                <Badge variant="outline">Sin Pago</Badge>
                            )}
                         </div>
                         <p className="text-xs text-muted-foreground">Por: {sale.registeredByName || 'Sistema'}</p>
                          <div className="flex justify-center items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={onViewSale} title="Ver / Cancelar Venta">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onReprintTicket} title="Reimprimir Ticket" disabled={isCancelled}>
                                    <Printer className="h-4 w-4" />
                                </Button>
                         </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
});

SaleCard.displayName = 'SaleCard';
