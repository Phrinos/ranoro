
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Driver, Vehicle } from "@/types";
import { formatCurrency } from '@/lib/utils';
import { DollarSign, CalendarDays, ArrowRight, Minus, Plus } from 'lucide-react';

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  driver: Driver;
  vehicle: Vehicle;
  onSave: (details: { amount: number; daysCovered: number }) => void;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  driver,
  vehicle,
  onSave,
}: RegisterPaymentDialogProps) {
  const [activeTab, setActiveTab] = useState("dias");
  const [daysToPay, setDaysToPay] = useState(1);
  const [amountToPay, setAmountToPay] = useState(vehicle?.dailyRentalCost || 0);

  useEffect(() => {
    if (open) {
      setDaysToPay(1);
      setAmountToPay(vehicle?.dailyRentalCost || 0);
      setActiveTab("dias");
    }
  }, [open, vehicle]);

  const dailyRate = vehicle?.dailyRentalCost || 0;
  const calculatedAmountFromDays = daysToPay * dailyRate;
  const calculatedDaysFromAmount = dailyRate > 0 ? amountToPay / dailyRate : 0;
  
  const handleSave = () => {
    if (activeTab === "dias") {
      if (daysToPay > 0) {
        onSave({ amount: calculatedAmountFromDays, daysCovered: daysToPay });
      }
    } else { // activeTab === "cantidad"
      if (amountToPay > 0) {
        onSave({ amount: amountToPay, daysCovered: calculatedDaysFromAmount });
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Registrar Pago para {driver.name}</DialogTitle>
          <DialogDescription>
            Vehículo: {vehicle.licensePlate} - Renta Diaria: {formatCurrency(dailyRate)}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dias">Por Días</TabsTrigger>
            <TabsTrigger value="cantidad">Por Cantidad</TabsTrigger>
          </TabsList>
          <TabsContent value="dias">
            <Card className="mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="days-to-pay">Días a Pagar</Label>
                   <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setDaysToPay(d => Math.max(1, d - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="days-to-pay"
                        type="number"
                        min="1"
                        value={daysToPay}
                        onChange={(e) => setDaysToPay(Number(e.target.value))}
                        className="text-center text-lg font-bold h-10"
                      />
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setDaysToPay(d => d + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                </div>
                <div className="flex items-center justify-center text-lg font-semibold gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground"/>
                    <span>{daysToPay} día(s)</span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                    <DollarSign className="h-5 w-5 text-muted-foreground"/>
                    <span>{formatCurrency(calculatedAmountFromDays)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="cantidad">
            <Card className="mt-4">
              <CardContent className="pt-6 space-y-4">
                 <div className="space-y-2">
                  <Label htmlFor="amount-to-pay">Cantidad a Pagar</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount-to-pay"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amountToPay}
                      onChange={(e) => setAmountToPay(e.target.value === '' ? '' : Number(e.target.value))}
                      className="pl-8 h-10"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center text-lg font-semibold gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground"/>
                    <span>{formatCurrency(amountToPay as number)}</span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground"/>
                    <CalendarDays className="h-5 w-5 text-muted-foreground"/>
                    <span>Cubre {calculatedDaysFromAmount.toFixed(2)} día(s)</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Registrar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
