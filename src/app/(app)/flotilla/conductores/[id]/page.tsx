
// src/app/(app)/flotilla/conductores/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Title } from "@/components/Title";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PersonalInfoCard } from "@/app/(app)/flotilla/components/PersonalInfoCard";
import {
  EditFinancialInfoDialog,
  type FinancialInfoFormValues,
} from "@/app/(app)/flotilla/components/EditFinancialInfoDialog";

import { mockDrivers } from "@/data/mock-data";
import type { Driver } from "@/types";

const getDriver = (id: string): Promise<Driver> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const driver = mockDrivers.find((d: Driver) => d.id === id);
      if (driver) resolve(driver);
      else reject(new Error("Driver not found"));
    }, 150);
  });
};

const updateDriver = (id: string, data: Partial<Driver>): Promise<Driver> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const driver = mockDrivers.find((d: Driver) => d.id === id);
      if (!driver) return reject(new Error("Driver not found"));

      Object.assign(driver, data);
      resolve(driver);
    }, 150);
  });
};

export default function Page() {
  const [driver, setDriver] = useState<Driver | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const params = useParams() as { id?: string };

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    getDriver(id)
      .then(setDriver)
      .catch(() => toast.error("No se encontró el conductor"));
  }, [params?.id]);

  const handleSave = async (data: FinancialInfoFormValues) => {
    try {
      if (!driver) return;

      // ✅ Convertimos Date -> ISO string para que encaje con Driver (string | undefined)
      const payload: Partial<Driver> = {
        ...data,
        notaryPowerRegistrationDate: data.notaryPowerRegistrationDate
          ? data.notaryPowerRegistrationDate.toISOString()
          : undefined,
        notaryPowerExpirationDate: data.notaryPowerExpirationDate
          ? data.notaryPowerExpirationDate.toISOString()
          : undefined,
      };

      const updatedDriver = await updateDriver(driver.id, payload);
      setDriver(updatedDriver);
      setIsEditDialogOpen(false);
      toast.success("Información financiera actualizada");
    } catch {
      toast.error("Error al actualizar la información financiera");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Title title={driver?.name ?? ""} />
      </div>

      <Separator />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3">
          <PersonalInfoCard driver={driver} />
        </div>

        <div className="col-span-12 lg:col-span-9">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Información financiera</h2>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              disabled={!driver}
            >
              Editar
            </Button>
          </div>

          <Separator className="my-2" />

          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <p className="text-sm text-muted-foreground">Poder notarial</p>
            <p className="text-sm col-span-2">{driver?.hasNotaryPower ? "Sí" : "No"}</p>

            <p className="text-sm text-muted-foreground">Fecha de registro</p>
            <p className="text-sm col-span-2">{driver?.notaryPowerRegistrationDate ?? "N/A"}</p>

            <p className="text-sm text-muted-foreground">Fecha de vencimiento</p>
            <p className="text-sm col-span-2">{driver?.notaryPowerExpirationDate ?? "N/A"}</p>
          </div>
        </div>
      </div>

      <EditFinancialInfoDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        driver={driver}
        onSave={handleSave}
      />
    </div>
  );
}
