
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Driver, Vehicle, PaymentMethod } from "@/types";
import { DollarSign, Wallet, CreditCard, Send, Landmark } from 'lucide-react';
import { subDays, isBefore, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

const paymentOptions: PaymentMethod[] = ['Efectivo', 'Tarjeta', 'Transferencia'];

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Landmark,
};

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  onSave: (driverId: string, amount: number, paymentMethod: PaymentMethod, note: string | undefined, mileage?: number) => void;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  drivers,
  vehicles,
  onSave,
}: RegisterPaymentDialogProps) {
  const { toast } = useToast();
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [mileage, setMileage] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [needsMileageUpdate, setNeedsMileageUpdate] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setSelectedDriverId('');
      setAmount('');
      setMileage('');
      setNote('');
      setNeedsMileageUpdate(false);
      setPaymentMethod('Efectivo');
      return;
    }

    if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      const vehicle = vehicles.find(v => v.id === driver?.assignedVehicleId);
      
      if (vehicle) {
        setAmount(vehicle.dailyRentalCost || '');
        
        const sevenDaysAgo = subDays(new Date(), 7);
        const lastUpdate = vehicle.lastMileageUpdate ? parseISO(vehicle.lastMileageUpdate) : null;
        
        const showMileageField = !lastUpdate || (isValid(lastUpdate) && isBefore(lastUpdate, sevenDaysAgo));
        setNeedsMileageUpdate(showMileageField);
        
        if (showMileageField) {
          setMileage(vehicle.currentMileage || '');
        } else {
          setMileage('');
        }
      }
    } else {
        setAmount('');
        setMileage('');
        setNote('');
        setNeedsMileageUpdate(false);
    }
  }, [selectedDriverId, drivers, vehicles, open]);
  
  const handleSave = () => {
    if (!selectedDriverId) {
        toast({ title: 'Error', description: 'Por favor, seleccione un conductor.', variant: 'destructive' });
        return;
    }
    if (amount === '' || Number(amount) <= 0) {
        toast({ title: 'Error', description: 'Por favor, ingrese un monto válido.', variant: 'destructive' });
        return;
    }
    if (needsMileageUpdate && (mileage === '' || Number(mileage) < 0)) {
        toast({ title: 'Error', description: 'El kilometraje es obligatorio y debe ser un número positivo.', variant: 'destructive' });
        return;
    }

    onSave(selectedDriverId, Number(amount), paymentMethod, note, mileage !== '' ? Number(mileage) : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Registrar Pago de Renta</DialogTitle>
          <DialogDescription>
            Seleccione el conductor y confirme los detalles del pago.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="driver-select">Conductor</Label>
            <Select onValueChange={setSelectedDriverId} value={selectedDriverId}>
                <SelectTrigger id="driver-select"><SelectValue placeholder="Seleccione un conductor" /></SelectTrigger>
                <SelectContent>
                {[...drivers]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="amount-input">Monto del Pago</Label>
                <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="amount-input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="pl-8" />
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="payment-method-select">Método</Label>
                <Select onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} value={paymentMethod}>
                    <SelectTrigger id="payment-method-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {paymentOptions.map(opt => {
                            const Icon = paymentMethodIcons[opt];
                            return (
                                <SelectItem key={opt} value={opt}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4"/>
                                    <span>{opt}</span>
                                  </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
            </div>
           </div>
          {needsMileageUpdate && (
            <div className="space-y-2">
                <Label htmlFor="mileage-input">Kilometraje Actual (Obligatorio)</Label>
                <Input id="mileage-input" type="number" value={mileage} onChange={(e) => setMileage(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 125000" />
                <p className="text-sm text-muted-foreground">Se requiere actualizar el kilometraje (última vez hace más de 7 días).</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="note-input">Concepto o Nota (Opcional)</Label>
            <Textarea id="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Pago de renta semana 25" />
          </div>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={handleSave}>
            Registrar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
