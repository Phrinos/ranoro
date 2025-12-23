// src/app/(app)/servicios/components/ServiceDetailsCard.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Signature } from "lucide-react";
import type { ServiceFormValues } from "@/schemas/service-form";
import type { User } from "@/types";
import { cn } from "@/lib/utils";
import type { VehicleFormValues } from "@/schemas/vehicle-form-schema";

const statusOptions: { value: ServiceFormValues["status"]; label: string }[] = [
  { value: "Cotizacion", label: "Cotización" },
  { value: "Agendado", label: "Agendado" },
  { value: "En Taller", label: "En Taller" },
  { value: "Entregado", label: "Entregado" },
  { value: "Cancelado", label: "Cancelado" },
  { value: "Proveedor Externo", label: "Proveedor Externo" },
];

const subStatusOptions = [
  "En Diagnóstico", "Esperando Refacciones", "En Reparación", "Pruebas Finales", "Lavado", "Listo para Entrega"
];

interface ServiceDetailsCardProps {
  isReadOnly?: boolean;
  advisors: User[];
  technicians: User[];          
  onOpenSignature: (type: "reception" | "delivery" | "advisor" | "technician") => void;
  isNew: boolean;
}

export function ServiceDetailsCard({
  isReadOnly,
  advisors,
  technicians,
  onOpenSignature,
}: ServiceDetailsCardProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ServiceFormValues>();

  const watchedStatus = watch("status");
  const isFinalStatus = watchedStatus === "Cancelado" || watchedStatus === "Entregado";
  const advisorSigned = !!watch("serviceAdvisorSignatureDataUrl");
  const technicianSigned = !!watch("technicianSignatureDataUrl");
  
  const advisorId = watch("serviceAdvisorId") ?? "";
  const advisorName = watch("serviceAdvisorName") ?? "";
  const technicianId = watch("technicianId") ?? "";
  const technicianName = watch("technicianName") ?? "";

  const safeAdvisors = React.useMemo(() => {
    if (advisorId && !advisors.some(a => a.id === advisorId)) {
      return [{ id: advisorId, name: advisorName || "(asesor)" } as User, ...advisors];
    }
    return advisors;
  }, [advisors, advisorId, advisorName]);

  const safeTechnicians = React.useMemo(() => {
    if (technicianId && !technicians.some(t => t.id === technicianId)) {
      return [{ id: technicianId, name: technicianName || "(técnico)" } as User, ...technicians];
    }
    return technicians;
  }, [technicians, technicianId, technicianName]);

  const handleStatusChange = (newStatus: ServiceFormValues["status"]) => {
    if (newStatus === "En Taller" && !watch("receptionDateTime" as any)) {
      setValue("receptionDateTime" as any, new Date(), { shouldDirty: true });
    }
    if (newStatus === "Agendado" && !watch("appointmentDateTime" as any)) {
      setValue("appointmentDateTime" as any, new Date(), { shouldDirty: true });
    }
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
  };
  
  const handleUserSelection = (
    id: string,
    userList: User[],
    idField: keyof ServiceFormValues,
    nameField: keyof ServiceFormValues,
    signatureField: keyof ServiceFormValues
  ) => {
    const selectedUser = userList.find(u => u.id === id);
    if (selectedUser) {
      (setValue as any)(idField, String(selectedUser.id), { shouldDirty: true });
      (setValue as any)(nameField, selectedUser.name ?? "", { shouldDirty: true });
      (setValue as any)(signatureField, selectedUser.signatureDataUrl ?? null, { shouldDirty: true });
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
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <Label className={cn(errors.status && "text-destructive")}>Estado</Label>
                <Select
                  key={String(field.value ?? 'status-empty')}
                  onValueChange={(v) => handleStatusChange(v as ServiceFormValues["status"])}
                  value={field.value as string | undefined}
                  disabled={isFinalStatus}
                >
                  <div>
                    <SelectTrigger className={cn("font-bold bg-card", errors.status && "border-destructive focus-visible:ring-destructive")}>
                      <SelectValue placeholder="Seleccione un estado">
                        {statusOptions.find(s => s.value === field.value)?.label}
                      </SelectValue>
                    </SelectTrigger>
                  </div>
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

          {watchedStatus === 'En Taller' && (
            <FormField
              control={control}
              name={"subStatus" as any}
              render={({ field }) => (
                <FormItem>
                  <Label>Sub-estado</Label>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <div>
                      <SelectTrigger><SelectValue placeholder="Seleccione un sub-estado" /></SelectTrigger>
                    </div>
                    <SelectContent>
                      {subStatusOptions.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField
            control={control}
            name="serviceAdvisorId"
            render={({ field }) => (
              <FormItem>
                <Label>Asesor de Servicio</Label>
                <div className="flex items-center gap-2">
                  <Select
                    key={advisorId || 'advisor-empty'}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleUserSelection(value, advisors, "serviceAdvisorId", "serviceAdvisorName", "serviceAdvisorSignatureDataUrl");
                    }}
                    value={String(field.value ?? "")}
                    disabled={isReadOnly || safeAdvisors.length === 0}
                  >
                    <div>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Seleccione un asesor">
                          {advisorId
                            ? (advisorName || safeAdvisors.find(a => a.id === advisorId)?.name)
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </div>
                    <SelectContent>
                      {safeAdvisors.map((advisor) => (
                        <SelectItem key={advisor.id} value={advisor.id as any}>
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

          {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
            <FormField
              control={control}
              name="technicianId"
              render={({ field }) => (
                <FormItem>
                  <Label>Técnico</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleUserSelection(value, technicians, "technicianId", "technicianName", "technicianSignatureDataUrl");
                      }}
                      value={field.value ?? ""}
                      disabled={isReadOnly || safeTechnicians.length === 0}
                    >
                      <div>
                        <SelectTrigger className="bg-card">
                          <SelectValue placeholder="Seleccione un técnico" />
                        </SelectTrigger>
                      </div>
                      <SelectContent>
                        {safeTechnicians.map((technician) => (
                          <SelectItem key={technician.id} value={technician.id as any}>
                            {technician.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant={technicianSigned ? "secondary" : "outline"}
                      size="icon"
                      title={technicianSigned ? "Firma registrada" : "Capturar/actualizar firma del técnico"}
                      onClick={() => onOpenSignature("technician")}
                    >
                      <Signature className={cn("h-4 w-4", technicianSigned && "text-green-600")} />
                    </Button>
                  </div>
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
