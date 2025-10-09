// src/app/(app)/servicios/components/ServiceDetailsCard.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const subStatusOptions = [
  "En Diagnóstico", "Esperando Refacciones", "En Reparación", "Pruebas Finales", "Lavado", "Listo para Entrega"
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

  const handleStatusChange = (newStatus: ServiceFormValues["status"]) => {
    if (newStatus === "En Taller" && !watch("receptionDateTime")) {
      setValue("receptionDateTime", new Date(), { shouldDirty: true });
    }
    if (newStatus === "Agendado" && !watch("appointmentDateTime")) {
      setValue("appointmentDateTime", new Date(), { shouldDirty: true });
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
      setValue(idField, selectedUser.id, { shouldDirty: true });
      setValue(nameField, selectedUser.name, { shouldDirty: true });
      setValue(signatureField, selectedUser.signatureDataUrl || null, { shouldDirty: true });
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {/* Estado */}
          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.status && "text-destructive")}>Estado</FormLabel>
                <Select
                  onValueChange={(v) => handleStatusChange(v as ServiceFormValues["status"])}
                  value={field.value}
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

          {/* Sub-estado (si está en taller) */}
          {watchedStatus === 'En Taller' && (
            <FormField
              control={control}
              name="subStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione un sub-estado" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subStatusOptions.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}

          {/* Selector de Asesor */}
          <FormField
            control={control}
            name="serviceAdvisorId"
            render={({ field }) => {
              const advisorName = advisors.find(a => a.id === field.value)?.name || watch('serviceAdvisorName');
              return (
                <FormItem>
                  <FormLabel>Asesor de Servicio</FormLabel>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleUserSelection(value, advisors, "serviceAdvisorId", "serviceAdvisorName", "serviceAdvisorSignatureDataUrl");
                      }}
                      value={field.value}
                      disabled={isReadOnly || advisors.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-card">
                          <SelectValue placeholder="Seleccione un asesor">
                            {advisorName || "Seleccione un asesor"}
                          </SelectValue>
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
              )
            }}
          />

          {/* Selector de Tecnico */}
          {(watchedStatus === 'En Taller' || watchedStatus === 'Entregado') && (
            <FormField
              control={control}
              name="technicianId"
              render={({ field }) => {
                const technicianName = technicians.find(t => t.id === field.value)?.name || watch('technicianName');
                return (
                  <FormItem>
                    <FormLabel>Técnico</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleUserSelection(value, technicians, "technicianId", "technicianName", "technicianSignatureDataUrl");
                        }}
                        value={field.value}
                        disabled={isReadOnly || technicians.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-card">
                            <SelectValue placeholder="Seleccione un técnico">
                              {technicianName || "Seleccione un técnico"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map((technician) => (
                            <SelectItem key={technician.id} value={technician.id}>
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
                        onClick={() => onOpenSignature("advisor")} // This should likely open a dialog for the TECHNICIAN
                      >
                        <Signature className={cn("h-4 w-4", technicianSigned && "text-green-600")} />
                      </Button>
                    </div>
                  </FormItem>
                )
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
