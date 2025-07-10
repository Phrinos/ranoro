"use client";

import React, { useRef, useState } from "react";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Loader2, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/utils";
import { storage } from "@/lib/firebaseClient";

interface PhotoUploaderProps {
  /** Índice del reporte dentro del arreglo `photoReports`           */
  reportIndex: number;
  /** ID (o publicId) del servicio; se usa para la ruta en Storage    */
  serviceId: string;
  /**
   * Callback que actualiza el reporte en el formulario.
   * La firma usada en tu `ServiceForm` es (reportIndex, url: string)
   */
  onUploadComplete: (reportIndex: number, url: string) => void;
  /** Fotos que ya existen en el reporte                               */
  photosLength: number;
  /** Deshabilita el botón/input (p. ej., si el formulario es read-only) */
  disabled?: boolean;
  /** ‘camera’ obliga a abrir la cámara; ‘gallery’ abre el selector    */
  captureMode?: "camera" | "gallery";
  /** Límite de fotos por reporte                                     */
  maxPhotos?: number;
}

export function PhotoUploader({
  reportIndex,
  serviceId,
  onUploadComplete,
  photosLength,
  disabled,
  captureMode = "gallery",
  maxPhotos = 3,
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  /** Convierte un File → dataURL si `optimizeImage` falla            */
  const fileToDataURL = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => (reader.result ? res(reader.result as string) : rej());
      reader.onerror = () => rej();
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files;
    // limpia el input para poder seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!files || files.length === 0) return;

    /* VALIDACIONES -------------------------------------------------- */
    if (!serviceId) {
      toast({
        title: "Error",
        description: "Se necesita un ID de servicio para subir fotos.",
        variant: "destructive",
      });
      return;
    }

    if (photosLength + files.length > maxPhotos) {
      toast({
        title: `Límite de ${maxPhotos} foto(s) excedido`,
        description: `Solo puede subir ${maxPhotos} fotos en esta sección.`,
        variant: "destructive",
      });
      return;
    }

    if (!storage) {
      toast({
        title: "Storage no disponible",
        description: "Revisa la configuración de Firebase Storage.",
        variant: "destructive",
      });
      return;
    }
    /* --------------------------------------------------------------- */

    setIsUploading(true);
    toast({ title: `Subiendo ${files.length} imagen(es)…`, description: "Por favor espere…" });

    try {
      for (const file of Array.from(files)) {
        // 1️⃣  Optimización (reduce peso); si falla, usa el archivo tal cual
        let dataUrl: string;
        try {
          dataUrl = await optimizeImage(file, 1280);
        } catch {
          dataUrl = await fileToDataURL(file);
        }

        // 2️⃣  Sube a Firebase Storage
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}.jpg`;
        const photoRef = ref(storage, `service-photos/${serviceId}/${fileName}`);
        await uploadString(photoRef, dataUrl, "data_url");

        // 3️⃣  Obtiene URL pública y avisa al formulario
        const downloadURL = await getDownloadURL(photoRef);
        onUploadComplete(reportIndex, downloadURL);
      }

      toast({ title: "¡Listo!", description: "Imagen(es) añadida(s) al reporte." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error al subir",
        description:
          err instanceof Error ? err.message : "Ocurrió un error desconocido.",
        variant: "destructive",
        duration: 8000,
      });
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
        multiple
        onChange={handleFileChange}
        capture={captureMode === "camera" ? "environment" : undefined}
        className="hidden"
      />
    </>
  );
}
