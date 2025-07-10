
"use client";

import React, { useRef, useState } from "react";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Loader2, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/utils";
import { storage } from "@/lib/firebaseClient";

interface PhotoUploaderProps {
  reportIndex: number;
  serviceId: string;
  onUploadComplete: (reportIndex: number, url: string) => void;
  photosLength: number;
  disabled?: boolean;
  maxPhotos?: number;
}

export function PhotoUploader({
  reportIndex,
  serviceId,
  onUploadComplete,
  photosLength,
  disabled,
  maxPhotos = 3,
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input
    }
    if (!file) return;

    if (!serviceId) {
        toast({ title: "Error", description: "Se necesita un ID de servicio para subir fotos.", variant: "destructive" });
        return;
    }

    if (photosLength >= maxPhotos) {
        toast({ title: `Límite de ${maxPhotos} foto(s) excedido`, variant: "destructive" });
        return;
    }
    
    if (!storage) {
        toast({ title: "Storage no disponible", variant: "destructive" });
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
        
        onUploadComplete(reportIndex, downloadURL);
        
        toast({ title: "¡Listo!", description: "Imagen añadida correctamente." });

    } catch (err) {
        console.error("Error al subir:", err);
        toast({ title: "Error al subir", description: err instanceof Error ? err.message : "Ocurrió un error desconocido.", variant: "destructive" });
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
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        capture="environment"
        className="hidden"
      />
    </>
  );
}
