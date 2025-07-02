
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
  onUploadComplete: (reportIndex: number, downloadURL: string) => void;
  photosLength: number;
  disabled?: boolean;
}

export function PhotoUploader({ 
    reportIndex, 
    serviceId, 
    onUploadComplete, 
    photosLength,
    disabled 
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    if (!file) return;

    if (!storage) {
      toast({ title: 'Error de Configuración', description: 'El almacenamiento de archivos no está disponible.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    
    try {
      toast({ title: 'Procesando imagen...', description: `Optimizando ${file.name}...` });
      const optimizedDataUrl = await optimizeImage(file, 1280);
      
      toast({ title: 'Subiendo a la nube...', description: `Enviando ${file.name}...` });
      
      const photoName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const photoRef = ref(storage, `service-photos/${serviceId}/${photoName}`);
      
      await uploadString(photoRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(photoRef);
      
      onUploadComplete(reportIndex, downloadURL);
      
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
      setIsUploading(false);
    }
  };

  const isDisabled = disabled || isUploading || photosLength >= 3;

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
        Añadir Foto ({photosLength}/3)
      </Button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </>
  );
}
