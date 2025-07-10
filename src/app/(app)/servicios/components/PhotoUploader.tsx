
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/utils";
import { storage } from "@/lib/firebaseClient";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Loader2, Camera } from "lucide-react";
import React, { useRef, useState } from "react";

interface PhotoUploaderProps {
  reportIndex: number;
  serviceId: string;
  onUploadComplete: (reportIndex: number, urls: string[]) => void;
  photosLength: number;
  disabled?: boolean;
  captureMode?: 'camera' | 'gallery';
  maxPhotos?: number;
}

export function PhotoUploader({ 
    reportIndex, 
    serviceId, 
    onUploadComplete, 
    photosLength,
    disabled,
    captureMode = 'gallery',
    maxPhotos = 3,
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    if (!files || files.length === 0) return;
    
    if (!serviceId) {
        toast({ title: "Error", description: "Se necesita un ID de servicio para subir fotos.", variant: "destructive" });
        return;
    }

    if ((photosLength + files.length) > maxPhotos) {
      toast({ title: `Límite de ${maxPhotos} Fotos Excedido`, description: `Solo puede subir un máximo de ${maxPhotos} fotos en esta sección.`, variant: 'destructive' });
      return;
    }

    if (!storage) {
      toast({ title: 'Error de Configuración', description: 'El almacenamiento de archivos no está disponible.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    toast({ title: `Subiendo ${files.length} imagen(es)...`, description: 'Por favor espere...' });

    try {
        const uploadPromises = Array.from(files).map(async (file) => {
            const optimizedDataUrl = await optimizeImage(file, 1280);
            const photoName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}.jpg`;
            const photoRef = ref(storage, `service-photos/${serviceId}/${photoName}`);
            
            await uploadString(photoRef, optimizedDataUrl, 'data_url');
            return getDownloadURL(photoRef);
        });

        const downloadURLs = await Promise.all(uploadPromises);
        onUploadComplete(reportIndex, downloadURLs); // Pass all new URLs at once
        toast({ title: '¡Éxito!', description: `Se añadieron las imágenes a tu reporte.` });
    } catch (error) {
        console.error(`Error al subir fotos:`, error);
        let errorMessage = "Ocurrió un error desconocido al subir las imágenes.";
        if (error instanceof Error) {
          errorMessage = error.message.includes('storage/unauthorized')
            ? "Permiso denegado. Revisa las reglas de seguridad de Firebase Storage."
            : `Error: ${error.message}`;
        }
        toast({ title: `Error al subir`, description: errorMessage, variant: 'destructive', duration: 8000 });
    } finally {
        setIsUploading(false);
    }
  };


  const isDisabled = disabled || isUploading || photosLength >= maxPhotos;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={isDisabled}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Camera className="mr-2 h-4 w-4" />
        )}
        Añadir Foto ({photosLength}/{maxPhotos})
      </Button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        capture={captureMode === 'camera' ? 'environment' : undefined}
        className="hidden" 
        multiple
      />
    </>
  );
}
