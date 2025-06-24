
"use client";

import { useState } from 'react';
// import * as XLSX from 'xlsx'; // Removed static import to prevent build issues
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, AlertTriangle, Car, Wrench } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { migrateData, type ExtractedVehicle, type ExtractedService } from '@/ai/flows/data-migration-flow';
import { placeholderVehicles, placeholderServiceRecords, placeholderTechnicians, persistToFirestore } from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MigrationResult {
  vehicles: ExtractedVehicle[];
  services: ExtractedService[];
  vehiclesAdded: number;
  servicesAdded: number;
}

export default function MigracionDatosPage() {
  const [workbook, setWorkbook] = useState<any | null>(null); // Use `any` as type is now dynamic
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        toast({
          title: "Archivo no válido",
          description: "Por favor, seleccione un archivo con formato .xlsx",
          variant: "destructive",
        });
        resetState();
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => { // Made async for dynamic import
        try {
          const XLSX = await import('xlsx'); // Dynamic import
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          setSelectedSheet(wb.SheetNames[0]); // Auto-select the first sheet
          setFileName(file.name);
          setError(null);
          setMigrationResult(null);

          // Automatically set content for the first sheet
          const firstSheetCsv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
          setFileContent(firstSheetCsv);

        } catch (err) {
            console.error("Error reading XLSX file:", err);
            toast({ title: "Error al leer archivo", description: "El archivo podría estar corrupto o en un formato no soportado.", variant: "destructive" });
            resetState();
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSheetChange = async (sheetName: string) => { // Made async for dynamic import
    if (!workbook) return;
    const XLSX = await import('xlsx'); // Dynamic import
    setSelectedSheet(sheetName);
    const sheetCsv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    setFileContent(sheetCsv);
  };

  const resetState = () => {
    setFileContent(null);
    setFileName('');
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fileContent) {
      toast({
        title: "No hay datos para importar",
        description: "Por favor, seleccione un archivo y una hoja.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setError(null);
    setMigrationResult(null);

    try {
      const result = await migrateData({ csvContent: fileContent });
      
      let vehiclesAddedCount = 0;
      let servicesAddedCount = 0;

      // Process and add vehicles first
      result.vehicles.forEach((vehicleData, index) => {
        const plateExists = placeholderVehicles.some(
          v => v.licensePlate.toLowerCase() === vehicleData.licensePlate.toLowerCase()
        );
        if (!plateExists) {
          const newVehicle: Vehicle = {
            id: `VEH_MIG_${index}_${Date.now().toString(36)}`,
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            licensePlate: vehicleData.licensePlate,
            ownerName: vehicleData.ownerName,
            ownerPhone: vehicleData.ownerPhone || '',
          };
          placeholderVehicles.push(newVehicle);
          vehiclesAddedCount++;
        }
      });

      // Process and add services
      result.services.forEach(serviceData => {
        const vehicle = placeholderVehicles.find(
          v => v.licensePlate.toLowerCase() === serviceData.vehicleLicensePlate.toLowerCase()
        );

        if (vehicle) {
          const newService: ServiceRecord = {
            id: `MIG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            vehicleId: vehicle.id,
            serviceDate: serviceData.serviceDate,
            description: serviceData.description,
            totalCost: serviceData.totalCost,
            status: 'Completado', // Historical data is considered completed
            technicianId: placeholderTechnicians.length > 0 ? placeholderTechnicians[0].id : 'default_tech',
            suppliesUsed: [],
            serviceProfit: serviceData.totalCost * 0.4, // Estimate profit as 40% for historical data
          };
          placeholderServiceRecords.push(newService);
          servicesAddedCount++;
        }
      });
      
      await persistToFirestore();

      setMigrationResult({ ...result, vehiclesAdded: vehiclesAddedCount, servicesAdded: servicesAddedCount });
      toast({
        title: "Migración Completada",
        description: `Se procesaron ${vehiclesAddedCount} vehículos y ${servicesAddedCount} servicios.`,
        variant: "default"
      });

    } catch (e) {
      console.error(e);
      setError("La IA no pudo procesar el archivo. Revisa el formato e inténtalo de nuevo.");
      toast({
        title: "Error de Migración",
        description: "Hubo un problema al procesar el archivo con la IA.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Migración de Datos con IA"
        description="Importa datos históricos desde un archivo XLSX."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>1. Cargar Archivo</CardTitle>
              <CardDescription>
                Sube un archivo <code>.xlsx</code> con el historial de vehículos y servicios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-foreground mb-1">
                    Seleccionar archivo XLSX
                  </label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    disabled={isUploading}
                  />
                  {fileName && <p className="mt-2 text-sm text-muted-foreground">Archivo: {fileName}</p>}
                </div>

                {sheetNames.length > 0 && (
                   <div className="space-y-2">
                    <label htmlFor="sheet-select" className="block text-sm font-medium text-foreground">
                        Seleccionar hoja de cálculo
                    </label>
                    <Select value={selectedSheet} onValueChange={handleSheetChange}>
                        <SelectTrigger id="sheet-select">
                            <SelectValue placeholder="Seleccione una hoja" />
                        </SelectTrigger>
                        <SelectContent>
                            {sheetNames.map(name => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                   </div>
                )}

                <Button type="submit" className="w-full" disabled={!fileContent || isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isUploading ? "Procesando con IA..." : "Iniciar Importación"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="shadow-lg min-h-[300px]">
                <CardHeader>
                    <CardTitle>2. Resultados de la Importación</CardTitle>
                    <CardDescription>
                        Aquí se mostrarán los datos extraídos por la IA después del procesamiento.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isUploading && (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <p className="text-lg font-medium">Analizando datos...</p>
                            <p>La IA está leyendo y estructurando tu archivo. Esto puede tardar un momento.</p>
                        </div>
                    )}
                    {error && (
                         <div className="flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive/90 p-8 rounded-lg">
                            <AlertTriangle className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">Error en el Análisis</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {migrationResult && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center text-center text-green-700 bg-green-100 p-8 rounded-lg">
                                <CheckCircle className="h-12 w-12 mb-4" />
                                <p className="text-lg font-medium">¡Proceso Completado!</p>
                                <p className="text-sm">
                                    Se añadieron <span className="font-bold">{migrationResult.vehiclesAdded}</span> vehículos nuevos y <span className="font-bold">{migrationResult.servicesAdded}</span> servicios nuevos.
                                </p>
                            </div>
                            <Tabs defaultValue="vehicles">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="vehicles"><Car className="mr-2 h-4 w-4" /> Vehículos Importados ({migrationResult.vehicles.length})</TabsTrigger>
                                    <TabsTrigger value="services"><Wrench className="mr-2 h-4 w-4" /> Servicios Importados ({migrationResult.services.length})</TabsTrigger>
                                </TabsList>
                                <TabsContent value="vehicles">
                                    <div className="rounded-md border max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Placa</TableHead>
                                                    <TableHead>Vehículo</TableHead>
                                                    <TableHead>Propietario</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {migrationResult.vehicles.map((v, i) => (
                                                    <TableRow key={`v-${i}`}>
                                                        <TableCell className="font-mono">{v.licensePlate}</TableCell>
                                                        <TableCell>{v.make} {v.model} ({v.year})</TableCell>
                                                        <TableCell>{v.ownerName}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                                <TabsContent value="services">
                                     <div className="rounded-md border max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Placa</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead className="text-right">Costo</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {migrationResult.services.map((s, i) => (
                                                    <TableRow key={`s-${i}`}>
                                                        <TableCell>{format(parseISO(s.serviceDate), "dd MMM yyyy", { locale: es })}</TableCell>
                                                        <TableCell className="font-mono">{s.vehicleLicensePlate}</TableCell>
                                                        <TableCell className="truncate max-w-xs">{s.description}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(s.totalCost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                     {!isUploading && !migrationResult && !error && (
                         <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                            <p>Esperando archivo para procesar...</p>
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
