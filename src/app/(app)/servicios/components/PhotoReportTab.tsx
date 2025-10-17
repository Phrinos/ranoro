
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import { PhotoUploader } from './PhotoUploader';
import type { ServiceFormValues } from '@/schemas/service-form';

export default function PhotoReportTab() {
  const { control, watch, setValue } = useFormContext<ServiceFormValues>();
  const serviceId = watch('id');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'photoReports' as const,
  });

  const handleAddReport = () => {
    append({
      photos: [],
      title: 'Fotografías del vehículo',
      description: '',
    });
  };

  const onPhotoUploaded = (reportIndex: number, url: string) => {
    const current = (watch(`photoReports.${reportIndex}.photos`) ?? []) as string[];
    setValue(`photoReports.${reportIndex}.photos`, [...current, url], { shouldDirty: true, shouldValidate: true });
  };

  const onViewImage = (url: string) => window.open(url, '_blank');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte Fotográfico</CardTitle>
        <CardDescription>Documenta el proceso con imágenes. Puedes crear varios reportes.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {fields.map((field, index) => {
          const photos = (watch(`photoReports.${index}.photos`) ?? []) as string[];

          return (
            <Card key={field.id} className="p-4 bg-muted/30">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-base font-semibold">Reporte #{index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <FormField
                  control={control}
                  name={`photoReports.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describa el propósito de estas fotos..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((url, pIndex) => (
                    <button
                      type="button"
                      key={pIndex}
                      className="relative aspect-video w-full bg-muted rounded-md overflow-hidden group"
                      onClick={() => onViewImage(url)}
                    >
                      <Image
                        src={url}
                        alt={`Foto ${pIndex + 1}`}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="300px"
                        data-ai-hint="car damage photo"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                    </button>
                  ))}
                </div>

                <PhotoUploader
                  reportIndex={index}
                  serviceId={serviceId || ''}
                  onUploadComplete={onPhotoUploaded as any}
                  photosLength={photos.length}
                  maxPhotos={10}
                />
              </div>
            </Card>
          );
        })}

        <Button type="button" variant="outline" onClick={handleAddReport}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Reporte Fotográfico
        </Button>
      </CardContent>
    </Card>
  );
}
