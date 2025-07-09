
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFormContext, Controller, type Control } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Check, Signature, BrainCircuit, Loader2, Camera, Trash2, Eye } from "lucide-react";
import type { ServiceFormValues } from "./service-form";
import type { SafetyInspection, SafetyCheckStatus, SafetyCheckValue } from '@/types';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/utils";
import { storage } from "@/lib/firebaseClient";
import { ref, uploadString, getDownloadURL } from "firebase/storage";


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
    { name: "safetyInspection.suspension_terminales", label: "18. TERMINALES DE DIRECCIÓN" },
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

const ChecklistItemPhotoUploader = ({ itemName, serviceId, onUpload, photos, isReadOnly, onViewImage }: { 
    itemName: string, 
    serviceId: string, 
    onUpload: (itemName: string, url: string) => void, 
    photos: string[], 
    isReadOnly?: boolean,
    onViewImage: (url: string) => void 
}) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!file) return;

        setIsUploading(true);
        try {
            const optimizedUrl = await optimizeImage(file, 800);
            const storageRef = ref(storage, `service-photos/${serviceId}/checklist/${itemName}/${Date.now()}.jpg`);
            await uploadString(storageRef, optimizedUrl, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);
            onUpload(itemName, downloadURL);
            toast({ title: 'Foto subida', description: 'La foto se ha añadido a la inspección.' });
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({ title: 'Error al subir foto', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                {photos.map((url, index) => (
                    <button
                        type="button"
                        key={index}
                        className="relative aspect-video w-full bg-muted rounded-md overflow-hidden group"
                        onClick={() => onViewImage(url)}
                    >
                        <Image src={url} alt={`Foto ${index + 1}`} layout="fill" objectFit="cover" className="transition-transform duration-300 group-hover:scale-105"/>
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <Eye className="h-6 w-6 text-white" />
                        </div>
                    </button>
                ))}
            </div>
            {!isReadOnly && photos.length < 2 && (
                 <>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        Añadir Foto ({photos.length}/2)
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                 </>
            )}
        </div>
    );
};


const SafetyCheckRow = ({ name, label, control, isReadOnly, serviceId, onPhotoUploaded, onViewImage }: { 
    name: string; 
    label: string; 
    control: Control<ServiceFormValues>; 
    isReadOnly?: boolean; 
    serviceId: string; 
    onPhotoUploaded: (itemName: string, url: string) => void;
    onViewImage: (url: string) => void;
}) => {
  return (
    <Controller
      name={name as any}
      control={control}
      defaultValue={{ status: 'na', photos: [] }}
      render={({ field }) => (
        <div className="py-2 border-b last:border-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium pr-4">{label}</span>
            <div className="flex gap-2">
              {[
                { value: 'inmediata', color: 'bg-red-500', title: 'Requiere Reparación Inmediata' },
                { value: 'atencion', color: 'bg-yellow-400', title: 'Requiere Atención' },
                { value: 'ok', color: 'bg-green-500', title: 'Bien' },
              ].map(status => (
                <button
                  type="button"
                  key={status.value}
                  title={status.title}
                  onClick={() => !isReadOnly && field.onChange({ ...(field.value || { photos: [] }), status: status.value })}
                  disabled={isReadOnly}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    field.value?.status === status.value ? 'border-black dark:border-white scale-110' : 'border-transparent opacity-50',
                    isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-100'
                  )}
                >
                  <div className={cn("h-full w-full rounded-full flex items-center justify-center", status.color)}>
                      {field.value?.status === status.value && <Check className="h-4 w-4 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {(field.value?.status === 'atencion' || field.value?.status === 'inmediata') && (
            <div className="pl-4 mt-2">
              <ChecklistItemPhotoUploader
                itemName={name.split('.').pop()!}
                serviceId={serviceId}
                photos={field.value?.photos || []}
                onUpload={onPhotoUploaded}
                onViewImage={onViewImage}
                isReadOnly={isReadOnly}
              />
            </div>
          )}
        </div>
      )}
    />
  );
};


export const SafetyChecklist = ({ control, isReadOnly, onSignatureClick, signatureDataUrl, isEnhancingText, handleEnhanceText, serviceId, onPhotoUploaded, onViewImage }: { 
  control: Control<ServiceFormValues>; 
  isReadOnly?: boolean; 
  onSignatureClick: () => void;
  signatureDataUrl?: string;
  isEnhancingText: string | null;
  handleEnhanceText: (fieldName: 'notes' | 'vehicleConditions' | 'customerItems' | 'safetyInspection.inspectionNotes' | `photoReports.${number}.description`) => void;
  serviceId: string;
  onPhotoUploaded: (itemName: string, url: string) => void;
  onViewImage: (url: string) => void;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Puntos de Seguridad</CardTitle>
        <CardDescription>Documenta el estado de los componentes clave. Si un punto requiere atención, podrás adjuntar fotos.</CardDescription>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500" /><span>Bien</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-yellow-400" /><span>Requiere Atención</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500" /><span>Reparación Inmediata</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {inspectionGroups.map(group => (
            <div key={group.title}>
              <h4 className="font-bold text-base mb-2 border-b-2 border-primary pb-1">{group.title}</h4>
              <div className="space-y-1">
                {group.items.map(item => (
                  <SafetyCheckRow 
                    key={item.name} 
                    name={item.name} 
                    label={item.label} 
                    control={control} 
                    isReadOnly={isReadOnly} 
                    serviceId={serviceId}
                    onPhotoUploaded={onPhotoUploaded}
                    onViewImage={onViewImage}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
         <FormField
            control={control}
            name="safetyInspection.inspectionNotes"
            render={({ field }) => (
                <FormItem className="pt-4">
                    <FormLabel className="text-base font-semibold flex justify-between items-center w-full">
                      <span>Observaciones Generales de la Inspección</span>
                      {!isReadOnly && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleEnhanceText('safetyInspection.inspectionNotes')} disabled={isEnhancingText === 'safetyInspection.inspectionNotes' || !field.value}>
                            {isEnhancingText === 'safetyInspection.inspectionNotes' ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Mejorar texto</span>
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Anotaciones sobre la inspección, detalles de los puntos que requieren atención, etc."
                            className="min-h-[100px]"
                            disabled={isReadOnly}
                            {...field}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        <div>
            <FormLabel className="text-base font-semibold">Firma del Técnico</FormLabel>
            <div className="mt-2 p-2 min-h-[100px] border rounded-md bg-muted/50 flex items-center justify-center">
                {signatureDataUrl ? (
                    <div className="relative w-full h-full max-w-[200px] aspect-video">
                        <Image src={signatureDataUrl} alt="Firma del técnico" layout="fill" objectFit="contain" />
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">Firma pendiente</span>
                )}
            </div>
            {!isReadOnly && (
                <Button type="button" variant="outline" onClick={onSignatureClick} className="w-full mt-2">
                    <Signature className="mr-2 h-4 w-4" />
                    {signatureDataUrl ? 'Cambiar Firma' : 'Capturar Firma del Técnico'}
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};
