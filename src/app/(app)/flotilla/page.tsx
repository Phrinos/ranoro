
"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import { Title } from "@/components/Title";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleCard } from "@/app/(app)/flotilla/vehiculos/components/VehicleCard";
import {
  GlobalTransactionDialog,
  type GlobalTransactionFormValues,
} from "@/app/(app)/flotilla/components/GlobalTransactionDialog";
import {
  OwnerWithdrawalDialog,
  type OwnerWithdrawalFormValues,
} from "@/app/(app)/flotilla/components/OwnerWithdrawalDialog";

import { mockVehicles, mockDrivers } from "@/data/mock-data";
import type { Vehicle, Driver } from "@/types";

const getVehicles = (): Promise<Vehicle[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockVehicles);
    }, 500);
  });
};

const getDrivers = (): Promise<Driver[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDrivers);
    }, 500);
  });
};

const addOwnerWithdrawal = (data: OwnerWithdrawalFormValues): Promise<void> => {
  console.log(data);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
};

const addGlobalTransaction = (data: GlobalTransactionFormValues): Promise<void> => {
  console.log(data);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
};

export default function Page() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  React.useEffect(() => {
    getVehicles().then(setVehicles);
    getDrivers().then(setDrivers);
  }, []);

  const handleSavePayment = async (data: GlobalTransactionFormValues) => {
    try {
      await addGlobalTransaction(data);
      setIsPaymentDialogOpen(false);
      toast.success("Pago registrado con éxito");
    } catch (error) {
      toast.error("Error al registrar el pago");
    }
  };

  const handleSaveCharge = async (data: GlobalTransactionFormValues) => {
    try {
      await addGlobalTransaction(data);
      setIsChargeDialogOpen(false);
      toast.success("Cobro registrado con éxito");
    } catch (error) {
      toast.error("Error al registrar el cobro");
    }
  };

  const handleSaveWithdrawal = async (data: OwnerWithdrawalFormValues) => {
    try {
      await addOwnerWithdrawal(data);
      setIsWithdrawalDialogOpen(false);
      toast.success("Retiro registrado con éxito");
    } catch (error) {
      toast.error("Error al registrar el retiro");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Title title="Flotilla" />
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)}>
            Registrar pago
          </Button>
          <Button variant="outline" onClick={() => setIsChargeDialogOpen(true)}>
            Registrar cobro
          </Button>
          <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(true)}>
            Retiro de socio
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
          <TabsTrigger value="drivers">Conductores</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles" className="grid grid-cols-12 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="col-span-4">
              <VehicleCard vehicle={v} />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="drivers">Change your password here.</TabsContent>
      </Tabs>

      <GlobalTransactionDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={drivers}
        onSave={handleSavePayment}
        transactionType="payment"
      />

      <GlobalTransactionDialog
        open={isChargeDialogOpen}
        onOpenChange={setIsChargeDialogOpen}
        drivers={drivers}
        onSave={handleSaveCharge}
        transactionType="charge"
      />

      <OwnerWithdrawalDialog
        open={isWithdrawalDialogOpen}
        onOpenChange={setIsWithdrawalDialogOpen}
        vehicles={vehicles}
        onSave={handleSaveWithdrawal}
      />
    </div>
  );
}
