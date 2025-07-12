
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Package, BrainCircuit, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import type { ExtractedVehicle as ExtractedGenericVehicle, ExtractedService } from '@/ai/flows/data-migration-flow';
import type { ExtractedVehicleForMigration } from '@/ai/flows/vehicle-migration-flow';
import type { ExtractedProduct } from '@/ai/flows/product-migration-flow';
import { migrateData } from '@/ai/flows/data-migration-flow';
import { migrateVehicles } from '@/ai/flows/vehicle-migration-flow';
import { migrateProducts } from '@/ai/flows/product-migration-flow';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';
import { inventoryService } from '@/lib/services';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';

type MigrationResult = | { type: 'generic'; vehicles: ExtractedGenericVehicle[]; services: ExtractedService[]; vehiclesAdded: number; servicesAdded: number; } | { type: 'vehicles'; vehicles: ExtractedVehicleForMigration[]; vehiclesAdded: number; } | { type: 'products'; products: ExtractedProduct[]; productsAdded: number; };

export function MigracionPageContent() {
    const [workbook, setWorkbook] = useState<any | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'productos' | 'ia'>('vehiculos');
    const { toast } = useToast();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setFileName(file.name);

        try {
            const data = await file.arrayBuffer();
            const wb = xlsx.read(data);
            setWorkbook(wb);
            setSheetNames(wb.SheetNames);
            setSelectedSheet(wb.SheetNames[0]);
            handleSheetChange(wb.SheetNames[0], wb);
        } catch (e) {
            console.error("Error al leer el archivo:", e);
            setError("No se pudo leer el archivo. Asegúrese de que sea un .xlsx válido.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSheetChange = (sheetName: string, wb?: any) => {
        const currentWorkbook = wb || workbook;
        if (!currentWorkbook) return;

        setSelectedSheet(sheetName);
        const worksheet = currentWorkbook.Sheets[sheetName];
        const csvContent = xlsx.utils.sheet_to_csv(worksheet);
        setFileContent(csvContent);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!fileContent) {
            toast({ title: 'No hay datos', description: 'Por favor cargue un archivo y seleccione una hoja.', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        setMigrationResult(null);

        try {
            let vehiclesAddedCount = 0;
            if (activeTab === 'ia') {
                const result = await migrateData({ csvContent: fileContent });
                if (!result.vehicles || result.vehicles.length === 0) {
                   toast({ title: 'Migración Completa', description: `La IA no encontró vehículos para agregar.` });
                } else {
                    for (const vehicle of result.vehicles) {
                        await inventoryService.addVehicle(vehicle as unknown as VehicleFormValues);
                        vehiclesAddedCount++;
                    }
                }
                setMigrationResult({ ...result, type: 'generic', vehiclesAdded: vehiclesAddedCount, servicesAdded: 0 });
            
            } else if (activeTab === 'vehiculos') {
                const result = await migrateVehicles({ csvContent: fileContent });
                 if (!result.vehicles || result.vehicles.length === 0) {
                   toast({ title: 'Migración Completa', description: `La IA no encontró vehículos para agregar.` });
                } else {
                    for (const vehicle of result.vehicles) {
                        await inventoryService.addVehicle(vehicle as unknown as VehicleFormValues);
                        vehiclesAddedCount++;
                    }
                }
                setMigrationResult({ ...result, type: 'vehicles', vehiclesAdded: vehiclesAddedCount });

            } else { // productos
                const result = await migrateProducts({ csvContent: fileContent });
                let productsAddedCount = 0;
                if (result.products && result.products.length > 0) {
                    for (const product of result.products) {
                        await inventoryService.addItem(product as any);
                        productsAddedCount++;
                    }
                }
                setMigrationResult({ ...result, type: 'products', productsAdded: productsAddedCount });
            }
            toast({ title: "¡Migración Exitosa!", description: `Se han procesado los datos de la hoja "${selectedSheet}".` });
        } catch (e) {
            console.error("Error en la migración:", e);
            toast({ title: 'Error en Migración', description: `La IA no pudo procesar los datos. ${e instanceof Error ? e.message : ''}`, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const renderMigrationResult = () => {
        if (!migrationResult) return null;
        switch (migrationResult.type) {
            case 'generic':
                return <p>Vehículos añadidos: {migrationResult.vehiclesAdded}.</p>;
            case 'vehicles':
                return <p>Vehículos añadidos: {migrationResult.vehiclesAdded}</p>;
            case 'products':
                return <p>Productos añadidos: {migrationResult.productsAdded}</p>;
            default:
                return null;
        }
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit}>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>1. Cargar Archivo</CardTitle>
                    <CardDescription>Sube un archivo <code>.xlsx</code> con tu historial.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                            {isUploading ? (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Loader2 className="w-8 h-8 mb-4 text-primary animate-spin" />
                                    <p className="mb-2 text-sm text-muted-foreground">Procesando...</p>
                                </div>
                            ) : fileName ? (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                    <CheckCircle className="w-8 h-8 mb-4 text-green-500"/>
                                    <p className="mb-2 text-sm text-foreground"><span className="font-semibold">Archivo cargado:</span></p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Haz clic para subir</span> o arrastra</p>
                                    <p className="text-xs text-muted-foreground">Sólo archivos .XLSX</p>
                                </div>
                            )}
                             <Input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isUploading} />
                        </label>
                    </div>

                    {sheetNames.length > 0 && (
                        <Select onValueChange={(value) => handleSheetChange(value)} value={selectedSheet}>
                            <SelectTrigger><SelectValue placeholder="Seleccione una hoja" /></SelectTrigger>
                            <SelectContent>{sheetNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>
          </form>
        </div>
        <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vehiculos"><Car className="mr-2 h-4 w-4"/>Vehículos</TabsTrigger>
                    <TabsTrigger value="productos"><Package className="mr-2 h-4 w-4"/>Productos</TabsTrigger>
                    <TabsTrigger value="ia"><BrainCircuit className="mr-2 h-4 w-4"/>Análisis IA</TabsTrigger>
                </TabsList>
                <TabsContent value="vehiculos">
                    <Card><CardHeader><CardTitle>Migración de Vehículos</CardTitle><CardDescription>Usa esta opción si tu hoja contiene solo información de vehículos (nombre, tel, marca, modelo, año, y **placa**).</CardDescription></CardHeader><CardContent><Button className="w-full" onClick={(e) => handleSubmit(e as any)}>Iniciar Migración de Vehículos</Button></CardContent></Card>
                </TabsContent>
                <TabsContent value="productos">
                    <Card><CardHeader><CardTitle>Migración de Productos</CardTitle><CardDescription>Usa esta opción si tu hoja contiene solo información de productos (código, nombre, existencias, precios).</CardDescription></CardHeader><CardContent><Button className="w-full" onClick={(e) => handleSubmit(e as any)}>Iniciar Migración de Productos</Button></CardContent></Card>
                </TabsContent>
                <TabsContent value="ia">
                    <Card><CardHeader><CardTitle>Migración con IA</CardTitle><CardDescription>La IA analizará la hoja para extraer vehículos (**incluyendo placas**) e historial de servicios de forma automática.</CardDescription></CardHeader><CardContent><Button className="w-full" onClick={(e) => handleSubmit(e as any)}>Iniciar Migración con IA</Button></CardContent></Card>
                </TabsContent>
            </Tabs>
             {migrationResult && (
                <Card className="mt-6 bg-green-50 border-green-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-800"><CheckCircle /> ¡Migración Completa!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-green-700">
                        {renderMigrationResult()}
                    </CardContent>
                </Card>
            )}
            {isUploading && !migrationResult && (
                <Card className="mt-6">
                    <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-3"/>
                        <p>La IA está procesando los datos, por favor espere...</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    );
}
