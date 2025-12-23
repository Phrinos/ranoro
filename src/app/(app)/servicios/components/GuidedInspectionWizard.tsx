// src/app/(app)/servicios/components/GuidedInspectionWizard.tsx
"use client";

import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Camera, Check, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PhotoUploader } from './PhotoUploader'; 
import { Card, CardContent } from '@/components/ui/card';
import type { SafetyCheckValue } from '@/types';
import { Label } from '@/components/ui/label';


interface GuidedInspectionWizardProps {
    inspectionItems: { name: `safetyInspection.${string}`; label: string }[];
    onClose: () => void;
    serviceId: string;
    onPhotoUploaded: (fieldName: `safetyInspection.${string}`, url: string) => void;
}

export function GuidedInspectionWizard({ inspectionItems, onClose, serviceId, onPhotoUploaded }: GuidedInspectionWizardProps) {
    const { control, getValues, setValue, watch } = useFormContext();
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentItem = inspectionItems[currentIndex];
    
    const progress = ((currentIndex + 1) / inspectionItems.length) * 100;

    const goToNext = () => {
        if (currentIndex < inspectionItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose(); // Close when the last item is done
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleStatusChange = (newStatus: 'ok' | 'atencion' | 'inmediata') => {
        const currentItemName = currentItem.name;
        const currentValue = getValues(currentItemName) || { photos: [], notes: '' };
        setValue(currentItemName, { ...currentValue, status: newStatus }, { shouldDirty: true });
    };
    
    const statusOptions = [
        { value: 'ok', label: 'Bien', color: 'bg-green-500 hover:bg-green-600', ringColor: 'ring-green-500' },
        { value: 'atencion', label: 'Atención', color: 'bg-yellow-400 hover:bg-yellow-500', ringColor: 'ring-yellow-400' },
        { value: 'inmediata', label: 'Inmediata', color: 'bg-red-500 hover:bg-red-600', ringColor: 'ring-red-500' },
    ];


    return (
        <div className="flex flex-col h-full p-4">
            <Progress value={progress} className="w-full mb-4" />
            <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Punto {currentIndex + 1} de {inspectionItems.length}</p>
                <h3 className="text-lg font-semibold">{currentItem.label}</h3>
            </div>

            <div className="flex-grow space-y-4" key={currentItem.name}>
                <Controller
                    name={currentItem.name as any}
                    control={control}
                    defaultValue={{ status: 'na', photos: [], notes: '' }}
                    render={({ field }) => (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {statusOptions.map(status => (
                                    <Button
                                        key={status.value}
                                        type="button"
                                        variant="default"
                                        onClick={() => handleStatusChange(status.value as any)}
                                        className={cn(
                                            "h-12 text-white text-xs sm:text-sm transition-all",
                                            status.color,
                                            field.value?.status === status.value 
                                                ? `ring-2 ring-offset-2 opacity-100 ${status.ringColor}`
                                                : 'opacity-60 hover:opacity-100'
                                        )}
                                    >
                                        {status.label}
                                    </Button>
                                ))}
                            </div>
                            
                            <Card className="bg-white">
                              <CardContent className="p-4 space-y-4">
                                 <FormField
                                    control={control}
                                    name={`${currentItem.name}.notes` as any}
                                    render={({ field: notesField }) => (
                                      <FormItem>
                                        <Label className="text-xs">Notas</Label>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Detalles sobre este punto..."
                                            rows={2}
                                            className="text-sm bg-white"
                                            {...notesField}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                   <div>
                                      <Label className="text-xs">Fotos</Label>
                                       <p className="text-xs text-muted-foreground">Sube hasta 2 fotos como evidencia.</p>
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            {(watch(currentItem.name as any)?.photos || []).map((photoUrl: string, pIndex: number) => (
                                                <div key={pIndex} className="relative aspect-video w-full bg-muted rounded-md overflow-hidden group">
                                                    <Image src={photoUrl} alt={`Foto ${pIndex + 1}`} fill style={{objectFit:"contain"}} sizes="150px" />
                                                </div>
                                            ))}
                                        </div>
                                       <PhotoUploader
                                            reportIndex={0} // Not needed for this context, but prop is required
                                            fieldName={currentItem.name} // Pass the specific field name
                                            serviceId={serviceId}
                                            onUploadComplete={(fieldName, url) => onPhotoUploaded(fieldName as any, url)}
                                            photosLength={(watch(currentItem.name as any)?.photos || []).length}
                                            maxPhotos={2}
                                        />
                                   </div>
                                </CardContent>
                            </Card>

                        </div>
                    )}
                />
            </div>

            <div className="flex justify-between items-center pt-4 mt-auto">
                <Button type="button" variant="outline" onClick={goToPrev} disabled={currentIndex === 0} className="bg-white">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Anterior
                </Button>
                <Button type="button" onClick={goToNext}>
                    {currentIndex === inspectionItems.length - 1 ? 'Finalizar' : 'Siguiente'}
                    <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </div>
        </div>
    );
}
