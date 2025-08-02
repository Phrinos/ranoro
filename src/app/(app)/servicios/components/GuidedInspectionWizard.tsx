
"use client";

import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Camera, Check, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Image from "next/image";
import { PhotoUploader } from './PhotoUploader'; // Assuming it's adapted or a new one is made

interface GuidedInspectionWizardProps {
    inspectionItems: { name: string; label: string }[];
    onClose: () => void;
}

export function GuidedInspectionWizard({ inspectionItems, onClose }: GuidedInspectionWizardProps) {
    const { control, getValues, setValue } = useFormContext();
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
        const currentValue = getValues(currentItem.name) || { photos: [], notes: '' };
        setValue(currentItem.name, { ...currentValue, status: newStatus });
    };

    return (
        <div className="flex flex-col h-full">
            <Progress value={progress} className="w-full mb-4" />
            <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Punto {currentIndex + 1} de {inspectionItems.length}</p>
                <h3 className="text-lg font-semibold">{currentItem.label}</h3>
            </div>

            <div className="flex-grow space-y-4 p-1">
                <Controller
                    name={currentItem.name as any}
                    control={control}
                    defaultValue={{ status: 'na', photos: [], notes: '' }}
                    render={({ field }) => (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'ok', label: 'Bien', color: 'bg-green-500 hover:bg-green-600' },
                                    { value: 'atencion', label: 'Atención', color: 'bg-yellow-400 hover:bg-yellow-500' },
                                    { value: 'inmediata', label: 'Inmediata', color: 'bg-red-500 hover:bg-red-600' },
                                ].map(status => (
                                    <Button
                                        key={status.value}
                                        type="button"
                                        variant="default"
                                        onClick={() => handleStatusChange(status.value as any)}
                                        className={cn(
                                            "h-16 text-white text-xs sm:text-sm",
                                            status.color,
                                            field.value?.status === status.value && 'ring-2 ring-offset-2 ring-black dark:ring-white'
                                        )}
                                    >
                                        {status.label}
                                    </Button>
                                ))}
                            </div>

                             <FormField
                                control={control}
                                name={`${currentItem.name}.notes` as any}
                                render={({ field: notesField }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Notas</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Detalles sobre este punto..."
                                        rows={2}
                                        className="text-sm"
                                        {...notesField}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                               <div>
                                  <FormLabel className="text-xs">Fotos</FormLabel>
                                   <p className="text-xs text-muted-foreground">Sube hasta 2 fotos como evidencia.</p>
                                   {/* Placeholder for PhotoUploader functionality */}
                                   <div className="mt-2 p-4 border-2 border-dashed rounded-md flex items-center justify-center h-24">
                                      <Button type="button" variant="ghost">
                                          <Camera className="mr-2 h-5 w-5"/>
                                          Añadir Foto
                                      </Button>
                                   </div>
                               </div>

                        </div>
                    )}
                />
            </div>

            <div className="flex justify-between items-center pt-4 mt-auto">
                <Button type="button" variant="outline" onClick={goToPrev} disabled={currentIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Anterior
                </Button>
                 <Button type="button" variant="secondary" onClick={onClose}>
                    <X className="mr-2 h-4 w-4" />
                    Cerrar Asistente
                </Button>
                <Button type="button" onClick={goToNext}>
                    {currentIndex === inspectionItems.length - 1 ? 'Finalizar' : 'Siguiente'}
                    <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </div>
        </div>
    );
}

