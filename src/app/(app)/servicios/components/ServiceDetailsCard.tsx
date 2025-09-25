
// src/app/(app)/servicios/components/ServiceDetailsCard.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
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
  technicians: User[];          // no se usa aquí, lo dejamos por compatibilidad
  serviceTypes: ServiceTypeRecord[]; // no se usa aquí, lo dejamos por compatibilidad
  onOpenSignature: (type: "reception" | "delivery" | "advisor") => void;
  isNew: boolean;
}

export function ServiceDetailsCard({
  isReadOnly,
  advisors,
  technicians,       // eslint-disable-line @typescript-eslint/no-unused-vars
  serviceTypes,      // eslint-disable-line @typescript-eslint/no-unused-vars
  onOpenSignature,
  isNew,
}: ServiceDetailsCardProps) {
  const {
    control,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useFormContext<ServiceFormValues>();

  const watchedStatus = watch("status");
  const isFinalStatus = watchedStatus === "Cancelado" || watchedStatus === "Entregado";

  const watchedAdvisorId = watch("serviceAdvisorId");
  const watchedAdvisorName = watch("serviceAdvisorName");
  const advisorSigned = !!watch("serviceAdvisorSignatureDataUrl");

  // Usuario autenticado (para autollenar)
  const authUser = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as Partial<User>) : null;
    } catch {
      return null;
    }
  }, []);

  // Asegura que los 3 campos del asesor queden poblados Y REGISTRADOS
  useEffect(() => {
    // 1) Si ya tenemos id y nombre, solo intenta hidratar firma si falta
    if (watchedAdvisorId && watchedAdvisorName) {
      if (!advisorSigned) {
        const found = advisors.find((a) => a.id === watchedAdvisorId);
        if (found?.signatureDataUrl) {
          setValue("serviceAdvisorSignatureDataUrl", found.signatureDataUrl, { shouldDirty: true });
        }
      }
      return;
    }

    // 2) Usa current user si existe
    if (authUser?.id && authUser?.name) {
      if (!watchedAdvisorId) setValue("serviceAdvisorId", authUser.id, { shouldDirty: true });
      if (!watchedAdvisorName) setValue("serviceAdvisorName", authUser.name, { shouldDirty: true });
      if (authUser.signatureDataUrl && !advisorSigned) {
        setValue("serviceAdvisorSignatureDataUrl", authUser.signatureDataUrl, { shouldDirty: true });
      }
      return;
    }

    // 3) Si hay id pero no nombre, toma de la lista de asesores
    if (watchedAdvisorId && !watchedAdvisorName) {
      const found = advisors.find((a) => a.id === watchedAdvisorId);
      if (found?.name) {
        setValue("serviceAdvisorName", found.name, { shouldDirty: true });
        if (found.signatureDataUrl && !advisorSigned) {
          setValue("serviceAdvisorSignatureDataUrl", found.signatureDataUrl, { shouldDirty: true });
        }
      }
      return;
    }

    // 4) Último recurso: primer asesor de la lista
    if (!watchedAdvisorId && advisors.length > 0) {
      const first = advisors[0];
      setValue("serviceAdvisorId", first.id, { shouldDirty: true });
      setValue("serviceAdvisorName", first.name, { shouldDirty: true });
      if (first.signatureDataUrl) {
        setValue("serviceAdvisorSignatureDataUrl", first.signatureDataUrl, { shouldDirty: true });
      }
    }
  }, [advisors, authUser, advisorSigned, setValue, watchedAdvisorId, watchedAdvisorName]);

  const handleStatusChange = (newStatus: ServiceFormValues["status"]) => {
    if (newStatus === "En Taller" && !watch("receptionDateTime")) {
      setValue("receptionDateTime", new Date(), { shouldDirty: true });
    } else if (newStatus !== "Agendado") {
      setValue("appointmentDateTime", null as any, { shouldDirty: true });
    }
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
  };

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
                <FormLabel className={cn(errors.status && "text-destructive")}>Estado</FormLabel>
                <Select
                  onValueChange={(v) => handleStatusChange(v as ServiceFormValues["status"])}
                  value={field.value || "Cotizacion"}
                  disabled={isFinalStatus}
                >
                  <FormControl>
                    <SelectTrigger className={cn("font-bold", errors.status && "border-destructive focus-visible:ring-destructive")}>
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

          {/* Asesor (solo lectura pero REGISTRADO) */}
          <FormField
            control={control}
            name="serviceAdvisorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asesor de Servicio</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl className="flex-1">
                    <Input
                      {...field}
                      value={field.value ?? ""}   // mantiene el binding con RHF
                      readOnly
                      disabled
                      className="bg-muted/40 font-medium"
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant={advisorSigned ? "secondary" : "outline"}
                    size="icon"
                    title={advisorSigned ? "Firma registrada" : "Capturar/actualizar firma del asesor"}
                    onClick={() => onOpenSignature("advisor")}
                  >
                    <Signature className={cn("h-4 w-4", advisorSigned && "text-green-600")} />
                  </Button>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* 🔒 Campos ocultos para que se ENVÍEN con el submit */}
        <input type="hidden" {...register("serviceAdvisorId")} value={watchedAdvisorId || ""} readOnly />
        <input type="hidden" {...register("serviceAdvisorSignatureDataUrl")} value={watch("serviceAdvisorSignatureDataUrl") || ""} readOnly />
      </CardContent>
    </Card>
  );
}
