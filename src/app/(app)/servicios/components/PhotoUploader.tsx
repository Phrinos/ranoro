
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/utils";
import { storage } from "@/lib/firebaseClient";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Loader2, Camera } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";

interface PhotoUploaderProps {
  reportIndex: number;
  serviceId: string;
  onUploadComplete: (reportIndex: number, downloadURL: string) => void;
  photosLength: number;
  disabled?: boolean;
  captureMode?: 'camera' | 'gallery'; // New prop
  maxPhotos?: number; // New prop
}

export function PhotoUploader({ 
    reportIndex, 
    serviceId, 
    onUploadComplete, 
    photosLength,
    disabled,
    captureMode = 'gallery', // Default to gallery
    maxPhotos = 3, // Default to 3
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    if (!files || files.length === 0) return;
    
    const totalPhotos = photosLength + files.length;
    if (totalPhotos > maxPhotos) {
      toast({ title: `Límite de ${maxPhotos} Fotos Excedido`, description: `Solo puede subir un máximo de ${maxPhotos} fotos en esta sección.`, variant: 'destructive' });
      return;
    }

    if (!storage) {
      toast({ title: 'Error de Configuración', description: 'El almacenamiento de archivos no está disponible.', variant: 'destructive' });
      return;
    }

    if (isMounted.current) {
      setIsUploading(true);
    }
    
    toast({ title: `Subiendo ${files.length} imagen(es)...`, description: 'Por favor espere...' });

    for (const file of Array.from(files)) {
      try {
        const optimizedDataUrl = await optimizeImage(file, 1280);
        const photoName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}.jpg`;
        const photoRef = ref(storage, `service-photos/${serviceId}/${photoName}`);
        
        await uploadString(photoRef, optimizedDataUrl, 'data_url');
        const downloadURL = await getDownloadURL(photoRef);
        
        if (isMounted.current) {
          onUploadComplete(reportIndex, downloadURL);
        }
      } catch (error) {
        console.error(`Error al subir ${file.name}:`, error);
        let errorMessage = "Ocurrió un error desconocido al subir la imagen.";
        if (error instanceof Error) {
          errorMessage = error.message.includes('storage/unauthorized')
            ? "Permiso denegado. Revisa las reglas de seguridad de Firebase Storage."
            : `Error: ${error.message}`;
        }
        toast({ title: `Error al subir ${file.name}`, description: errorMessage, variant: 'destructive', duration: 8000 });
      }
    }

    if (isMounted.current) {
      setIsUploading(false);
      toast({ title: '¡Éxito!', description: `Se añadieron las imágenes a tu reporte.` });
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
