// src/app/(app)/servicios/components/SafetyChecklist.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Loader2, PlayCircle } from "lucide-react";
import type { SafetyInspection, SafetyCheckStatus, SafetyCheckValue } from '@/types';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GuidedInspectionWizard } from './GuidedInspectionWizard';
import { PhotoUploader } from './PhotoUploader';

const inspectionGroups = [
  { title: "LUCES", items: [
    { name: "safetyInspection.luces_altas_bajas_niebla", label: "1. ALTAS, BAJAS Y NIEBLA" },
    { name: "safetyInspection.luces_cuartos", label: "2. CUARTOS DELANTEROS, TRASEROS Y LATERALES" },
    { name: "safetyInspection.luces_direccionales", label: "3. DIRECCIONALES E INTERMITENTES" },
    { name: "safetyInspection.luces_frenos_reversa", label: "4. FRENOS Y REVERSA" },
    { name: "safetyInspection.luces_interiores", label: "5. INTERIORES" },
  ]},
  { title: "FUGAS Y NIVELES", items: [
    { name: "safetyInspection.fugas_refrigerante", label: "6. REFRIGERANTE" },
    { name: "safetyInspection.fugas_limpiaparabrisas", label: "7. LIMPIAPARABRISAS" },
    { name: "safetyInspection.fugas_frenos_embrague", label: "8. FRENOS Y EMBRAGUE" },
    { name: "safetyInspection.fugas_transmision", label: "9. TRANSMISIÓN Y TRANSEJE" },
    { name: "safetyInspection.fugas_direccion_hidraulica", label: "10. DIRECCIÓN HIDRÁULICA" },
  ]},
  { title: "CARROCERÍA", items: [
    { name: "safetyInspection.carroceria_cristales_espejos", label: "11. CRISTALES / ESPEJOS" },
    { name: "safetyInspection.carroceria_puertas_cofre", label: "12. PUERTAS / COFRE / CAJUELA / SALPICADERA" },
    { name: "safetyInspection.carroceria_asientos_tablero", label: "13. ASIENTOS / TABLERO / CONSOLA" },
    { name: "safetyInspection.carroceria_plumas", label: "14. PLUMAS LIMPIAPARABRISAS" },
  ]},
  { title: "SUSPENSIÓN Y DIRECCIÓN", items: [
    { name: "safetyInspection.suspension_rotulas", label: "15. RÓTULAS Y GUARDAPOLVOS" },
    { name: "safetyInspection.suspension_amortiguadores", label: "16. AMORTIGUADORES" },
    { name: "safetyInspection.suspension_caja_direccion", label: "17. CAJA DE DIRECCIÓN" },
    { name: "safetyInspection.suspension_terminales", label: "18. TERMINALES DELANTERAS" },
  ]},
  { title: "LLANTAS (ESTADO Y PRESIÓN)", items: [
    { name: "safetyInspection.llantas_delanteras_traseras", label: "19. DELANTERAS / TRASERAS" },
    { name: "safetyInspection.llantas_refaccion", label: "20. REFACCIÓN" },
  ]},
  { title: "FRENOS", items: [
    { name: "safetyInspection.frenos_discos_delanteros", label: "21. DISCOS / BALATAS DELANTERAS" },
    { name: "safetyInspection.frenos_discos_traseros", label: "22. DISCOS / BALATAS TRASERAS" },
  ]},
  { title: "OTROS", items: [
    { name: "safetyInspection.otros_tuberia_escape", label: "23. TUBERÍA DE ESCAPE" },
    { name: "safetyInspection.otros_soportes_motor", label: "24. SOPORTES DE MOTOR" },
    { name: "safetyInspection.otros_claxon", label: "25. CLAXON" },
    { name: "safetyInspection.otros_inspeccion_sdb", label: "26. INSPECCIÓN DE SDB" },
  ]},
];

const StatusIndicator = ({ status }: { status?: SafetyCheckStatus }) => {
  const statusInfo = {
    ok: { label: "Bien", color: "bg-green-500", textColor: "text-green-700" },
    atencion: { label: "Atención", color: "bg-yellow-400", textColor: "text-yellow-700" },
    inmediata: { label: "Inmediata", color: "bg-red-500", textColor: "text-red-700" },
    na: { label: "N/A", color: "bg-gray-300", textColor: "text-gray-500" },
  };
  const currentStatus = statusInfo[status || 'na'] || statusInfo.na;

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${currentStatus.color}`} />
      <span className={cn("text-xs font-semibold", currentStatus.textColor)}>{currentStatus.label}</span>
    </div>
  );
};

const SafetyChecklistReport = ({ inspection, signatureDataUrl, technicianName }: {
  inspection: SafetyInspection,
  signatureDataUrl?: string;
  technicianName?: string;
}) => {
  const { control, getValues } = useFormContext();
  const isEnhancingText = null; // Placeholder for AI feature
  const handleEnhanceText = () => {}; // Placeholder for AI feature

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {inspectionGroups.map(group => (
            <div key={group.title}>
              <h4 className="font-bold text-base mb-2 border-b-2 border-primary pb-1">{group.title}</h4>
              <div className="space-y-1">
                {group.items.map(item => {
                  const keyName = item.name.replace('safetyInspection.', '') as keyof Omit<SafetyInspection, 'inspectionNotes' | 'technicianSignature'>;
                  const checkItem = (inspection as any)[keyName];
                  const val = typeof checkItem === 'string' ? { status: checkItem } : checkItem;
                  return (
                    <div key={item.name} className="py-1 border-b border-dashed last:border-none">
                      <div className="flex justify-between items-center text-sm">
                        <span className="pr-4">{item.label}</span>
                        <StatusIndicator status={val?.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
         <FormField
            control={control}
            name="safetyInspection.inspectionNotes"
            render={({ field }) => (
                <FormItem className="pt-4">
                    <Label className="text-base font-semibold flex justify-between items-center w-full">
                      <span>Observaciones Generales de la Inspección</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText()} disabled={isEnhancingText === 'safetyInspection.inspectionNotes' || !getValues('safetyInspection.inspectionNotes')}>
                            {isEnhancingText === 'safetyInspection.inspectionNotes' ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Mejorar texto</span>
                        </Button>
                    </Label>
                    <div>
                        <Textarea
                            placeholder="Anotaciones sobre la inspección, detalles de los puntos que requieren atención, etc."
                            className="min-h-[100px]"
                            {...field}
                        />
                    </div>
                </FormItem>
            )}
        />
        <div>
            <Label className="text-base font-semibold">Firma del Técnico</Label>
            <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex flex-col items-center justify-center">
                {signatureDataUrl ? (
                    <div className="relative w-full max-w-[200px] aspect-[2/1]">
                        <Image src={signatureDataUrl} alt="Firma del técnico" fill style={{objectFit:"contain"}} sizes="200px" crossOrigin="anonymous"/>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">Firma automática del técnico.</span>
                )}
                 <p className="text-xs text-muted-foreground mt-2 font-semibold">{technicianName || 'Técnico no asignado'}</p>
            </div>
        </div>
    </div>
  )
}

interface SafetyChecklistProps {
  isWizardOpen: boolean;
  setIsWizardOpen: (isOpen: boolean) => void;
}

export const SafetyChecklist = ({ isWizardOpen, setIsWizardOpen }: SafetyChecklistProps) => {
  const { watch, setValue } = useFormContext();
  const inspectionData = watch('safetyInspection');
  const serviceId = watch('id');
  const signatureDataUrl = watch('serviceAdvisorSignatureDataUrl');
  const technicianName = watch('serviceAdvisorName');

  const hasInspectionData = inspectionData && Object.values(inspectionData).some(v => v && typeof v === 'object' && 'status' in v && v.status !== 'na');

  const onPhotoUploaded = (fieldName: `safetyInspection.${string}`, url: string) => {
    const currentPhotos = watch(`${fieldName}.photos`) || [];
    setValue(`${fieldName}.photos`, [...currentPhotos, url]);
  };
  
  useEffect(() => {
    // This effect ensures that if the prop changes (e.g., from the mobile bar),
    // the wizard will open.
    if (isWizardOpen) {
      // The setIsWizardOpen from the parent is already managing the state.
    }
  }, [isWizardOpen]);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Puntos de Seguridad</CardTitle>
        <CardDescription>Documenta el estado de los componentes clave.</CardDescription>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-sm">
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full bg-green-500" /><span>Bien</span></div>
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full bg-yellow-400" /><span>Requiere Atención</span></div>
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full bg-red-500" /><span>Reparación Inmediata</span></div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-0">
         {!hasInspectionData && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Button type="button" size="lg" onClick={() => setIsWizardOpen(true)}>
                    <PlayCircle className="mr-2 h-5 w-5"/>
                    Iniciar Revisión Guiada
                </Button>
                <p className="text-sm text-muted-foreground mt-4">Usa el asistente para una inspección rápida y estandarizada.</p>
            </div>
         )}

         {hasInspectionData && (
             <>
                <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsWizardOpen(true)}>
                        <PlayCircle className="mr-2 h-4 w-4"/>
                        Continuar Revisión
                    </Button>
                </div>
                <SafetyChecklistReport
                  inspection={inspectionData}
                  signatureDataUrl={signatureDataUrl}
                  technicianName={technicianName}
                />
             </>
         )}
      </CardContent>
    </Card>

    <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="sm:max-w-md p-0">
            <DialogHeader className="p-4 pb-0 sr-only">
              <DialogTitle>Asistente de Revisión de Seguridad</DialogTitle>
              <DialogDescription>Complete cada punto de la inspección de manera secuencial.</DialogDescription>
            </DialogHeader>
              <GuidedInspectionWizard 
                  inspectionItems={inspectionGroups.flatMap(g => g.items) as { name: `safetyInspection.${string}`; label: string }[]}
                  onClose={() => setIsWizardOpen(false)}
                  serviceId={serviceId}
                  onPhotoUploaded={onPhotoUploaded}
              />
        </DialogContent>
    </Dialog>
    </>
  );
};
