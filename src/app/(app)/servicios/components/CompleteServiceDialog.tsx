

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServiceRecord, PaymentMethod, InventoryItem } from "@/types";
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { addMonths } from "date-fns";
import type { ServiceFormValues } from "@/schemas/service-form";

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Efectivo+Transferencia",
  "Tarjeta+Transferencia"
];

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Send,
  "Efectivo+Transferencia": WalletCards,
  "Tarjeta+Transferencia": ArrowRightLeft,
};

const completeServiceSchema = z.object({
  paymentMethod: z.enum(paymentMethods, { required_error: "Debe seleccionar un método de pago." }),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
}).refine(data => {
  if ((data.paymentMethod === "Tarjeta" || data.paymentMethod === "Tarjeta+Transferencia") && !data.cardFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la tarjeta es obligatorio.",
  path: ["cardFolio"],
}).refine(data => {
  if ((data.paymentMethod === "Transferencia" || data.paymentMethod === "Efectivo+Transferencia" || data.paymentMethod === "Tarjeta+Transferencia") && !data.transferFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la transferencia es obligatorio.",
  path: ["transferFolio"],
});

type CompleteServiceFormValues = z.infer<typeof completeServiceSchema>;

interface CompleteServiceDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
  onConfirm: (service: ServiceRecord, paymentDetails: CompleteServiceFormValues, nextServiceInfo?: { date: string, mileage?: number }) => void;
  inventoryItems: InventoryItem[];
}

export function CompleteServiceDialog({
  open,
  onOpenChange,
  service,
  onConfirm,
  inventoryItems,
}: CompleteServiceDialogProps) {
  const form = useForm<CompleteServiceFormValues>({
    resolver: zodResolver(completeServiceSchema),
    defaultValues: {
      paymentMethod: service.paymentMethod || 'Efectivo',
      cardFolio: service.cardFolio || '',
      transferFolio: service.transferFolio || '',
    }
  });

  const selectedPaymentMethod = form.watch("paymentMethod");

  const handleFormSubmit = (values: CompleteServiceFormValues) => {
    let nextServiceInfo: { date: string, mileage?: number } | undefined = undefined;
    
    const serviceType = service.serviceType?.toLowerCase() || '';
    
    const isMaintenanceService = (service.serviceItems || []).some(item => 
        item.name.toLowerCase().includes('afinación') || 
        item.name.toLowerCase().includes('cambio de aceite')
    );

    if (isMaintenanceService) {
        const today = new Date();
        const nextServiceDate = addMonths(today, 6);
        
        const oilItem = (service.serviceItems || [])
            .flatMap(item => item.suppliesUsed || [])
            .map(supply => inventoryItems.find(inv => inv.id === supply?.supplyId))
            .find(invItem => invItem?.category.toLowerCase().includes('aceite') && invItem.rendimiento);

        let nextMileage: number | undefined = undefined;
        if (oilItem && service.mileage && oilItem.rendimiento) {
            nextMileage = service.mileage + oilItem.rendimiento;
        }

        nextServiceInfo = {
            date: nextServiceDate.toISOString(),
            mileage: nextMileage,
        };
    }

    onConfirm(service, values, nextServiceInfo);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar y Cobrar Servicio</DialogTitle>
          <DialogDescription>
            Confirme el método de pago para el vehículo {service.vehicleIdentifier}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(service.totalCost)}</p>
            </div>
            <Form {...form}>
                <form id="complete-service-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Método de Pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione método de pago" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {paymentMethods.map(method => {
                                    const Icon = paymentMethodIcons[method];
                                    return (
                                    <SelectItem key={method} value={method}>
                                        <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        <span>{method}</span>
                                        </div>
                                    </SelectItem>
                                    )
                                })}
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )}
                    />
                    {(selectedPaymentMethod === "Tarjeta" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                        <FormField control={form.control} name="cardFolio" render={({ field }) => (<FormItem><FormLabel>Folio Tarjeta</FormLabel><FormControl><Input placeholder="Folio de la transacción" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    )}
                    {(selectedPaymentMethod === "Transferencia" || selectedPaymentMethod === "Efectivo+Transferencia" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
                        <FormField control={form.control} name="transferFolio" render={({ field }) => (<FormItem><FormLabel>Folio Transferencia</FormLabel><FormControl><Input placeholder="Referencia de la transferencia" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    )}
                </form>
            </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="complete-service-form">
            Cobrar y Completar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
