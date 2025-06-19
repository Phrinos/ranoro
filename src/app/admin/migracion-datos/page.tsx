"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function MigracionDatosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.name === "Ranoro 2025.xlsx - 2025.csv" || selectedFile.name.endsWith(".csv") || selectedFile.name.endsWith(".xlsx")) {
         setFile(selectedFile);
      } else {
        toast({
          title: "Archivo no válido",
          description: "Por favor, seleccione un archivo 'Ranoro 2025.xlsx - 2025.csv' o un archivo .csv / .xlsx.",
          variant: "destructive",
        });
        setFile(null);
        event.target.value = ""; // Clear the input
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "No se seleccionó archivo",
        description: "Por favor, seleccione un archivo para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    // Simulate upload/processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // console.log("Importing file:", file.name);
    // Actual import logic would go here. For example, sending the file to a server endpoint.
    // For this demo, we just show a success toast.

    toast({
      title: "Importación Iniciada",
      description: `El archivo ${file.name} se está procesando. Esto puede tomar unos minutos.`,
    });
    
    // Simulate success after some more time
    setTimeout(() => {
       toast({
        title: "Importación Completada",
        description: `Los datos del archivo ${file.name} han sido importados exitosamente.`,
        variant: "default"
      });
      setIsUploading(false);
      setFile(null);
      // Clear file input if possible (depends on how input is managed)
      const form = event.target as HTMLFormElement;
      form.reset();

    }, 3000);

  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Migración de Datos"
        description="Importa datos existentes desde un archivo CSV o Excel."
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Importar Datos de Vehículos y Servicios</CardTitle>
          <CardDescription>
            Sube el archivo <code>Ranoro 2025.xlsx - 2025.csv</code> (o un archivo .csv/.xlsx compatible) 
            para migrar los datos al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-foreground mb-1">
                Seleccionar archivo
              </label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                disabled={isUploading}
              />
              {file && <p className="mt-2 text-sm text-muted-foreground">Archivo seleccionado: {file.name}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={!file || isUploading}>
              <UploadCloud className="mr-2 h-4 w-4" />
              {isUploading ? "Importando..." : "Iniciar Importación"}
            </Button>
          </form>
        </CardContent>
      </Card>
       <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
            <CardTitle>Instrucciones y Formato</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Asegúrate de que tu archivo CSV o Excel siga el formato esperado por el sistema.</p>
            <p>Columnas esperadas para vehículos: <code>ID_Vehiculo, Marca, Modelo, Año, VIN, Nombre_Propietario, Contacto_Propietario, Placa</code></p>
            <p>Columnas esperadas para servicios: <code>ID_Servicio, ID_Vehiculo_FK, Fecha_Servicio, Descripcion, ID_Tecnico_FK, ... (más columnas según necesidad)</code></p>
            <p><strong>Nota:</strong> Esta es una simulación. La lógica de procesamiento de archivos no está implementada en este demo.</p>
        </CardContent>
       </Card>
    </div>
  );
}
