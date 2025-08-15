// src/app/(app)/servicios/components/PhotoUploader.tsx
"use client";

import React, { useRef, useState, useCallback } from "react";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Loader2, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/utils";
import { storage } from "@/lib/firebaseClient";

interface PhotoUploaderProps {
  reportIndex?: number;
  fieldName?: `safetyInspection.${string}` | `photoReports.${number}`;
  serviceId: string;
  onUploadComplete: (fieldNameOrIndex: number | `safetyInspection.${string}` | `photoReports.${number}`, url: string) => void;
  photosLength: number;
  disabled?: boolean;
  maxPhotos?: number;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUploader({
  reportIndex,
  fieldName,
  serviceId,
  onUploadComplete,
  photosLength,
  disabled,
  maxPhotos = 3,
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (event.target) {
        event.target.value = "";
    }
    
    if (!file) return;

    if (!serviceId || serviceId === 'new') {
        toast({ title: "Guarda el servicio primero", description: "Debes guardar el servicio antes de poder añadir fotos.", variant: "destructive" });
        return;
    }

    if (photosLength >= maxPhotos) {
        toast({ title: `Límite de ${maxPhotos} foto(s) excedido`, variant: "destructive" });
        return;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({ title: "Tipo de archivo no válido", description: "Por favor, selecciona un archivo de imagen (jpg, png, webp).", variant: "destructive" });
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "Archivo demasiado grande", description: `El tamaño máximo de archivo es de ${MAX_FILE_SIZE_MB} MB.`, variant: "destructive" });
        return;
    }
    
    if (!storage) {
        toast({ title: "Storage no disponible", description: "No se ha podido conectar con el servidor de almacenamiento.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    toast({ title: "Subiendo imagen...", description: "Por favor, espere." });

    try {
        const dataUrl = await optimizeImage(file, 1280);
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}.jpg`;
        const photoRef = ref(storage, `service-photos/${serviceId}/${fileName}`);
        
        await uploadString(photoRef, dataUrl, "data_url");
        const downloadURL = await getDownloadURL(photoRef);
        
        const identifier = fieldName ?? reportIndex ?? 0;
        onUploadComplete(identifier, downloadURL);
        
        toast({ title: "¡Listo!", description: "Imagen añadida correctamente." });

    } catch (err) {
        console.error("Error al subir:", err);
        let errorMessage = "Ocurrió un error desconocido.";
        if (err instanceof Error) {
            if (err.message.includes("storage/unauthorized") || err.message.includes("storage/object-not-found")) {
                errorMessage = "No tienes permisos para realizar esta acción.";
            } else if (err.message.includes("network-request-failed")) {
                errorMessage = "Error de red. Por favor, comprueba tu conexión a internet.";
            } else {
                errorMessage = err.message;
            }
        }
        toast({ title: "Error al subir la imagen", description: errorMessage, variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  }, [serviceId, photosLength, maxPhotos, onUploadComplete, reportIndex, fieldName, toast]);
  
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
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_FILE_TYPES.join(",")}
        onChange={handlePhotoUpload}
        capture="environment"
        className="hidden"
      />
    </>
  );
}
