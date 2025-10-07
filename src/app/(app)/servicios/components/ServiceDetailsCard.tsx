
// src/app/(app)/servicios/components/ServiceDetailsCard.tsx
"use client";

import React, { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Signature } from "lucide-react";
import type { ServiceFormValues } from "@/schemas/service-form";
import type { User, ServiceTypeRecord } from "@/types";
import { cn } from "@/lib/utils";

const statusOptions: { value: ServiceFormValues["status"]; label: string }[] = [
  { value: "Cotizacion", label: "Cotización" },
  { value: "Agendado", label: "Agendado" },
  { value: "En Taller", label: "En Taller" },
  { value: "Entregado", label: "Entregado" },
];

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  advisors: User[];
  technicians: User[];          
  serviceTypes: ServiceTypeRecord[]; 
  onOpenSignature: (type: "reception" | "delivery" | "advisor") => void;
  isNew: boolean;
}

export function ServiceDetailsCard({
  isReadOnly,
  advisors,
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
  const watchedAdvisorId = watch("serviceAdvisorId");
  const advisorSigned = !!watch("serviceAdvisorSignatureDataUrl");

  // Efecto para auto-seleccionar el primer asesor si es un servicio nuevo y no hay ninguno seleccionado.
  useEffect(() => {
    if (isNew && !watchedAdvisorId && advisors.length > 0) {
      const defaultAdvisor = advisors[0];
      setValue("serviceAdvisorId", defaultAdvisor.id, { shouldDirty: true });
      setValue("serviceAdvisorName", defaultAdvisor.name, { shouldDirty: true });
      if (defaultAdvisor.signatureDataUrl) {
        setValue("serviceAdvisorSignatureDataUrl", defaultAdvisor.signatureDataUrl, { shouldDirty: true });
      }
    }
  }, [isNew, watchedAdvisorId, advisors, setValue]);

  const handleStatusChange = (newStatus: ServiceFormValues["status"]) => {
    if (newStatus === "En Taller" && !watch("receptionDateTime")) {
      setValue("receptionDateTime", new Date(), { shouldDirty: true });
    } else if (newStatus !== "Agendado") {
      setValue("appointmentDateTime", null as any, { shouldDirty: true });
    }
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
  };
  
  const handleAdvisorChange = (advisorId: string) => {
    const selectedAdvisor = advisors.find(a => a.id === advisorId);
    if (selectedAdvisor) {
        setValue("serviceAdvisorId", selectedAdvisor.id, { shouldDirty: true });
        setValue("serviceAdvisorName", selectedAdvisor.name, { shouldDirty: true });
        setValue("serviceAdvisorSignatureDataUrl", selectedAdvisor.signatureDataUrl || null, { shouldDirty: true });
    }
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
                    <SelectTrigger className={cn("font-bold bg-card", errors.status && "border-destructive focus-visible:ring-destructive")}>
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

          {/* Selector de Asesor */}
          <FormField
            control={control}
            name="serviceAdvisorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asesor de Servicio</FormLabel>
                <div className="flex items-center gap-2">
                    <Select
                        onValueChange={handleAdvisorChange}
                        value={field.value}
                        disabled={isReadOnly || advisors.length === 0}
                    >
                        <FormControl>
                        <SelectTrigger className="bg-card">
                            <SelectValue placeholder="Seleccione un asesor" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {advisors.map((advisor) => (
                            <SelectItem key={advisor.id} value={advisor.id}>
                            {advisor.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
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
      </CardContent>
    </Card>
  );
}
