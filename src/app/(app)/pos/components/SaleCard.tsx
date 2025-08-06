
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SaleReceipt, InventoryItem, Payment, User } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Printer, TrendingUp, User as UserIcon, DollarSign } from 'lucide-react';
import { formatCurrency, getPaymentMethodVariant } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { calculateSaleProfit } from '@/lib/placeholder-data';

interface SaleCardProps {
    sale: SaleReceipt;
    inventoryItems: InventoryItem[];
    users: User[];
    onViewSale: () => void;
    onReprintTicket: () => void;
    onEditPayment: () => void;
}

export const SaleCard = React.memo(({
    sale,
    inventoryItems,
    users,
    onViewSale,
    onReprintTicket,
    onEditPayment,
}: SaleCardProps) => {

    const saleDate = parseDate(sale.saleDate);
    const isCancelled = sale.status === 'Cancelado';

    const profit = useMemo(() => calculateSaleProfit(sale, inventoryItems), [sale, inventoryItems]);

    const itemsDescription = useMemo(() => {
        const firstItem = sale.items[0];
        if (!firstItem) return 'Venta sin artículos';
        
        const inventoryItem = inventoryItems.find(i => i.id === firstItem.inventoryItemId);
        const category = inventoryItem?.category?.toUpperCase() || 'ARTÍCULO';
        const otherItemsCount = sale.items.length - 1;
        
        return `${category}: ${firstItem.itemName}${otherItemsCount > 0 ? ` y ${otherItemsCount} más` : ''}`;
    }, [sale.items, inventoryItems]);
    
    const paymentBadges = useMemo(() => {
        if (isCancelled) {
            return [<Badge key="cancelled" variant="destructive" className="font-bold">CANCELADO</Badge>];
        }
        
        if (Array.isArray(sale.payments) && sale.payments.length > 0) {
            return sale.payments.map((p, index) => (
                <Badge key={index} variant={getPaymentMethodVariant(p.method)} className="text-xs">
                    {formatCurrency(p.amount)} <span className="font-normal ml-1 opacity-80">({p.method})</span>
                </Badge>
            ));
        }

        // Fallback for older records
        if (typeof sale.paymentMethod === 'string') {
            const methods = sale.paymentMethod.split(/[+/]/);
            const totalAmount = sale.totalAmount || 0;
            const amountPerMethod = totalAmount / methods.length;
            
            return methods.map((method, index) => (
                 <Badge key={index} variant={getPaymentMethodVariant(method.trim() as Payment['method'])} className="text-xs">
                    {formatCurrency(amountPerMethod)} <span className="font-normal ml-1 opacity-80">({method.trim()})</span>
                </Badge>
            ));
        }
        
        return [<Badge key="no-payment" variant="outline">Sin Pago</Badge>];
    }, [sale.payments, sale.paymentMethod, sale.totalAmount, isCancelled]);
    
    const sellerName = useMemo(() => {
        if (sale.registeredByName) return sale.registeredByName;
        if (sale.registeredById) {
            const seller = users.find(u => u.id === sale.registeredById);
            return seller?.name || 'Usuario no disponible';
        }
        return 'Usuario no disponible';
    }, [sale.registeredById, sale.registeredByName, users]);

    return (
        <Card className={cn("shadow-sm overflow-hidden", isCancelled && "bg-muted/60 opacity-80")}>
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row text-sm">
                    {/* Bloque 1: Fecha e ID venta */}
                    <div className="p-4 flex flex-col justify-center items-center text-center w-full md:w-40 flex-shrink-0 bg-card">
                        <p className="text-muted-foreground text-sm">{saleDate && isValid(saleDate) ? format(saleDate, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</p>
                        <p className="font-bold text-lg text-foreground">{saleDate && isValid(saleDate) ? format(saleDate, "dd MMM yyyy", { locale: es }) : "N/A"}</p>
                        <p className="text-muted-foreground text-xs mt-1">{sale.id}</p>
                    </div>

                    {/* Bloque 2: Artículos y Cliente */}
                    <div className="p-4 flex flex-col justify-center flex-grow space-y-2 border-y md:border-y-0 md:border-x">
                       <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <div className="font-bold text-lg">
                                 <p className="whitespace-normal">{itemsDescription}</p>
                               </div>
                             </TooltipTrigger>
                             <TooltipContent>
                               {sale.items.map(i => <p key={i.inventoryItemId}>{i.quantity} x {i.itemName}</p>)}
                             </TooltipContent>
                           </Tooltip>
                       </TooltipProvider>
                       <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <UserIcon className="h-3 w-3" />
                            <span>{sale.customerName || 'Cliente Mostrador'}</span>
                       </div>
                    </div>
                    
                    {/* Bloque 3: Costo y Atendio */}
                    <div className="p-4 flex flex-col items-center md:items-end justify-center text-center md:text-right w-full md:w-48 flex-shrink-0 space-y-2 border-t md:border-0">
                         <div>
                           <p className="text-xs text-muted-foreground">Costo Cliente</p>
                           <p className="font-bold text-xl text-primary">{formatCurrency(sale.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-base text-green-600 flex items-center gap-1 justify-end">
                                <TrendingUp className="h-4 w-4" /> {formatCurrency(profit)}
                            </p>
                        </div>
                    </div>

                    {/* Bloque 4: Método de Pago */}
                     <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-48 flex-shrink-0 space-y-2">
                        <p className="text-xs text-muted-foreground">Métodos de Pago</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                            {paymentBadges}
                         </div>
                    </div>

                    {/* Bloque 5: Acciones y Vendedor */}
                    <div className="p-4 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l w-full md:w-auto flex-shrink-0 space-y-2">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Atendió</p>
                            <p className="text-xs">{sellerName}</p>
                        </div>
                        <div className="flex justify-center items-center gap-1 flex-wrap">
                            <Button variant="ghost" size="icon" onClick={onViewSale} title="Ver / Cancelar Venta">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onEditPayment} title="Editar Pago" disabled={isCancelled}>
                                <DollarSign className="h-4 w-4 text-green-600" />
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
