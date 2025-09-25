// src/app/(app)/servicios/components/ServiceDetailsCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Signature } from "lucide-react";
import type { ServiceFormValues } from "@/schemas/service-form";
import type { User, ServiceTypeRecord } from "@/types";
import { cn } from "@/lib/utils";
import { AUTH_USER_LOCALSTORAGE_KEY } from "@/lib/placeholder-data";

const statusOptions: { value: ServiceFormValues["status"]; label: string }[] = [
  { value: "Cotizacion", label: "Cotización" },
  { value: "Agendado", label: "Agendado" },
  { value: "En Taller", label: "En Taller" },
  { value: "Entregado", label: "Entregado" },
];

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  advisors: User[];
  technicians: User[]; // (no se usa aquí, pero lo mantenemos por compatibilidad)
  serviceTypes: ServiceTypeRecord[]; // (no se usa aquí, pero lo mantenemos por compatibilidad)
  onOpenSignature: (type: "reception" | "delivery" | "advisor") => void;
  isNew: boolean;
}

export function ServiceDetailsCard({
  isReadOnly,
  advisors,
  technicians, // eslint-disable-line @typescript-eslint/no-unused-vars
  serviceTypes, // eslint-disable-line @typescript-eslint/no-unused-vars
  onOpenSignature,
  isNew,
}: ServiceDetailsCardProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ServiceFormValues>();

  const watchedStatus = watch("status");
  const isFinalStatus = watchedStatus === "Cancelado" || watchedStatus === "Entregado";

  // Campos observados del asesor en el form
  const watchedAdvisorId = watch("serviceAdvisorId");
  const watchedAdvisorName = watch("serviceAdvisorName");
  const advisorSigned = !!watch("serviceAdvisorSignatureDataUrl");

  // Lee usuario autenticado desde localStorage (solo client)
  const authUser = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as Partial<User>) : null;
    } catch {
      return null;
    }
  }, []);

  // Hidrata asesor en el form si falta (preferencia: currentUser -> advisors list)
  useEffect(() => {
    // Si ya tenemos nombre y id, no tocar
    if (watchedAdvisorId && watchedAdvisorName) return;

    // 1) Usa current user si existe
    if (authUser?.id && authUser?.name) {
      if (!watchedAdvisorId) {
        setValue("serviceAdvisorId", authUser.id, { shouldDirty: true });
      }
      if (!watchedAdvisorName) {
        setValue("serviceAdvisorName", authUser.name, { shouldDirty: true });
      }
      if (authUser.signatureDataUrl && !watch("serviceAdvisorSignatureDataUrl")) {
        setValue("serviceAdvisorSignatureDataUrl", authUser.signatureDataUrl, { shouldDirty: true });
      }
      return;
    }

    // 2) Si hay id en el form pero no nombre, buscarlo en la lista de advisors
    if (watchedAdvisorId && !watchedAdvisorName) {
      const found = advisors.find((a) => a.id === watchedAdvisorId);
      if (found?.name) {
        setValue("serviceAdvisorName", found.name, { shouldDirty: true });
        if (found.signatureDataUrl && !watch("serviceAdvisorSignatureDataUrl")) {
          setValue("serviceAdvisorSignatureDataUrl", found.signatureDataUrl, { shouldDirty: true });
        }
      }
      return;
    }

    // 3) Si no hay nada, como fallback usa el primer asesor disponible
    if (!watchedAdvisorId && advisors.length > 0) {
      const first = advisors[0];
      setValue("serviceAdvisorId", first.id, { shouldDirty: true });
      setValue("serviceAdvisorName", first.name, { shouldDirty: true });
      if (first.signatureDataUrl) {
        setValue("serviceAdvisorSignatureDataUrl", first.signatureDataUrl, { shouldDirty: true });
      }
    }
  }, [
    advisors,
    authUser,
    setValue,
    watch,
    watchedAdvisorId,
    watchedAdvisorName,
  ]);

  const handleStatusChange = (newStatus: ServiceFormValues["status"]) => {
    if (newStatus === "En Taller" && !watch("receptionDateTime")) {
      setValue("receptionDateTime", new Date(), { shouldDirty: true });
    } else if (newStatus !== "Agendado") {
      setValue("appointmentDateTime", null as any, { shouldDirty: true });
    }
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
  };

  // Nombre mostrado (solo lectura)
  const advisorDisplayName = watchedAdvisorName || "—";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Detalles del Servicio</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Estado */}
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.status && "text-destructive")}>
                  Estado
                </FormLabel>
                <Select
                  onValueChange={(value) =>
                    handleStatusChange(value as ServiceFormValues["status"])
                  }
                  value={field.value || "Cotizacion"}
                  disabled={isFinalStatus}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        "font-bold",
                        errors.status && "border-destructive focus-visible:ring-destructive"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Asesor (solo lectura) */}
          <FormField
            control={control}
            name="serviceAdvisorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asesor de Servicio</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl className="flex-1">
                    <Input
                      value={advisorDisplayName}
                      readOnly
                      disabled
                      className="bg-muted/40 font-medium"
                    />
                  </FormControl>
                  {/* Botón opcional para capturar/actualizar firma del asesor */}
                  <Button
                    type="button"
                    variant={advisorSigned ? "secondary" : "outline"}
                    size="icon"
                    title={advisorSigned ? "Firma registrada" : "Capturar firma del asesor"}
                    onClick={() => onOpenSignature("advisor")}
                  >
                    <Signature className={cn("h-4 w-4", advisorSigned && "text-green-600")} />
                  </Button>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Campos ocultos para mantener el estado del form */}
        <input type="hidden" value={watchedAdvisorId || ""} readOnly />
      </CardContent>
    </Card>
  );
}
