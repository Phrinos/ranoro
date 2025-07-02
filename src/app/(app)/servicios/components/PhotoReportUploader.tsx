
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage } from '../../../../lib/firebaseClient';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { optimizeImage } from '@/lib/utils';

interface PhotoReportUploaderProps {
  reportIndex: number;
  serviceId: string;
  photos: string[];
  onPhotoUploaded: (reportIndex: number, url: string) => void;
  setGlobalUploading: (isUploading: boolean) => void;
  isGlobalUploading: boolean;
}

export function PhotoReportUploader({
  reportIndex,
  serviceId,
  photos,
  onPhotoUploaded,
  setGlobalUploading,
  isGlobalUploading
}: PhotoReportUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    if (photos.length >= 3) {
      toast({ title: 'Límite Excedido', description: 'No puede subir más de 3 fotos por reporte.', variant: 'destructive' });
      return;
    }

    if (!storage) {
      toast({ title: 'Error de Configuración', description: 'El almacenamiento de archivos no está disponible.', variant: 'destructive' });
      return;
    }

    setGlobalUploading(true);
    toast({ title: 'Procesando imagen...', description: `Optimizando ${file.name}...` });

    try {
      const optimizedDataUrl = await optimizeImage(file, 1280);
      toast({ title: 'Subiendo a la nube...', description: `Enviando ${file.name}...` });

      const finalServiceId = serviceId || `temp_${Date.now()}`;
      const photoName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const photoRef = ref(storage, `service-photos/${finalServiceId}/${photoName}`);
      
      await uploadString(photoRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(photoRef);
      
      onPhotoUploaded(reportIndex, downloadURL);
      
      toast({
        title: '¡Éxito!',
        description: `Se añadió la imagen a tu reporte.`,
      });
    } catch (error) {
      console.error(`Error al subir ${file.name}:`, error);
      let errorMessage = "Ocurrió un error desconocido al subir la imagen.";
      if (error instanceof Error) {
        errorMessage = error.message.includes('storage/unauthorized')
          ? "Permiso denegado. Revisa las reglas de seguridad de Firebase Storage."
          : `Error: ${error.message}`;
      }
      toast({
        title: `Error al subir ${file.name}`,
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setGlobalUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={isGlobalUploading}
      >
        {isGlobalUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Camera className="mr-2 h-4 w-4" />
        )}
        Añadir Foto ({photos.length}/3)
      </Button>
    </>
  );
}
