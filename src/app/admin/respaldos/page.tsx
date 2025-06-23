"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { getAllData, restoreAllData, DATA_KEYS } from '@/lib/placeholder-data';
import { DownloadCloud, UploadCloud, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RespaldosPage() {
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const handleCreateBackup = () => {
    try {
      const allData = getAllData();
      const jsonData = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      a.href = url;
      a.download = `ranoro_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Respaldo Creado",
        description: "El archivo de respaldo se ha descargado."
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({
        title: "Error al Crear Respaldo",
        description: "No se pudo generar el archivo de respaldo.",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast({
          title: "Archivo no válido",
          description: "Por favor, seleccione un archivo de respaldo .json.",
          variant: "destructive"
        });
        setFileToRestore(null);
        return;
      }
      setFileToRestore(file);
    }
  };

  const handleRestoreBackup = () => {
    if (!fileToRestore) {
      toast({
        title: "No hay archivo",
        description: "Por favor, seleccione un archivo de respaldo para restaurar.",
        variant: "destructive"
      });
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const proceedWithRestore = () => {
    setIsConfirmDialogOpen(false);
    if (!fileToRestore) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const backupData = JSON.parse(text);

        // Basic validation to see if it looks like a valid backup file
        const requiredKeys = Object.values(DATA_KEYS);
        const hasAllKeys = requiredKeys.every(key => backupData.hasOwnProperty(key));

        if (!hasAllKeys) {
          throw new Error("El archivo no parece ser un respaldo válido de Ranoro.");
        }

        restoreAllData(backupData);
        
        toast({
          title: "Restauración Exitosa",
          description: "Los datos han sido restaurados. La aplicación se recargará."
        });

        // Force reload to apply changes everywhere
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (error: any) {
        console.error("Error restoring backup:", error);
        toast({
          title: "Error al Restaurar",
          description: error.message || "El archivo de respaldo está dañado o tiene un formato incorrecto.",
          variant: "destructive"
        });
        setIsRestoring(false);
      }
    };
    reader.onerror = () => {
        toast({
          title: "Error de Lectura",
          description: "No se pudo leer el archivo seleccionado.",
          variant: "destructive"
        });
        setIsRestoring(false);
    }
    reader.readAsText(fileToRestore);
  };

  return (
    <>
      <PageHeader
        title="Respaldos y Restauración"
        description="Crea respaldos de tus datos o restaura la aplicación desde un archivo."
      />
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Crear Respaldo</CardTitle>
            <CardDescription>
              Descarga una copia completa de todos tus datos (vehículos, servicios, inventario, etc.) en un único archivo JSON. Guarda este archivo en un lugar seguro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateBackup} className="w-full">
              <DownloadCloud className="mr-2 h-4 w-4" />
              Crear y Descargar Respaldo
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Restaurar desde Respaldo</CardTitle>
            <CardDescription>
              Selecciona un archivo de respaldo (.json) para restaurar todos los datos de la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-xs">
                    <strong>¡Atención!</strong> Restaurar un respaldo reemplazará permanentemente TODOS los datos actuales en la aplicación.
                </p>
            </div>
            <Input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={isRestoring}
            />
            <Button onClick={handleRestoreBackup} className="w-full" disabled={!fileToRestore || isRestoring}>
              <UploadCloud className="mr-2 h-4 w-4" />
              {isRestoring ? 'Restaurando...' : 'Restaurar Datos'}
            </Button>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Todos los datos actuales (vehículos, servicios, ventas, etc.) se borrarán y serán reemplazados por los datos del archivo de respaldo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithRestore} className="bg-destructive hover:bg-destructive/90">
              Sí, entiendo. Restaurar ahora.
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
