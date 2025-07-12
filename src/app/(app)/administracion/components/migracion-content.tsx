
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Package, BrainCircuit, Upload, Loader2, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type AnalysisResult = | { type: 'generic'; vehicles: ExtractedGenericVehicle[]; services: ExtractedService[]; } | { type: 'vehicles'; vehicles: ExtractedVehicleForMigration[]; } | { type: 'products'; products: ExtractedProduct[]; };

export function MigracionPageContent() {
    const [workbook, setWorkbook] = useState<any | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'productos' | 'ia'>('vehiculos');
    const { toast } = useToast();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);
        setFileName(file.name);
        setAnalysisResult(null); // Reset previous results

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
            setIsAnalyzing(false);
        }
    };

    const handleSheetChange = (sheetName: string, wb?: any) => {
        const currentWorkbook = wb || workbook;
        if (!currentWorkbook) return;

        setSelectedSheet(sheetName);
        const worksheet = currentWorkbook.Sheets[sheetName];
        const csvContent = xlsx.utils.sheet_to_csv(worksheet);
        setFileContent(csvContent);
        setAnalysisResult(null); // Reset results when sheet changes
    };

    const handleAnalyze = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!fileContent) {
            toast({ title: 'No hay datos', description: 'Por favor cargue un archivo y seleccione una hoja.', variant: 'destructive' });
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            let result;
            if (activeTab === 'ia') {
                const rawResult = await migrateData({ csvContent: fileContent });
                result = { ...rawResult, type: 'generic' as const };
            } else if (activeTab === 'vehiculos') {
                const rawResult = await migrateVehicles({ csvContent: fileContent });
                result = { ...rawResult, type: 'vehicles' as const };
            } else { // productos
                const rawResult = await migrateProducts({ csvContent: fileContent });
                result = { ...rawResult, type: 'products' as const };
            }
            setAnalysisResult(result);
            toast({ title: "¡Análisis Completo!", description: "Revisa los datos extraídos por la IA antes de guardarlos." });
        } catch (e) {
            console.error("Error en el análisis:", e);
            toast({ title: 'Error en Análisis', description: `La IA no pudo procesar los datos. ${e instanceof Error ? e.message : ''}`, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmAndSave = async () => {
        if (!analysisResult) {
            toast({ title: 'No hay resultado', description: 'Realiza un análisis primero.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        let itemsAdded = 0;
        let entityType = '';
        try {
            if (analysisResult.type === 'vehicles' || analysisResult.type === 'generic') {
                entityType = 'Vehículos';
                if (analysisResult.vehicles && analysisResult.vehicles.length > 0) {
                    for (const vehicle of analysisResult.vehicles) {
                        await inventoryService.addVehicle(vehicle as unknown as VehicleFormValues);
                        itemsAdded++;
                    }
                }
            } else if (analysisResult.type === 'products') {
                entityType = 'Productos';
                if (analysisResult.products && analysisResult.products.length > 0) {
                    for (const product of analysisResult.products) {
                        await inventoryService.addItem(product as any);
                        itemsAdded++;
                    }
                }
            }
            toast({ title: "¡Migración Exitosa!", description: `Se guardaron ${itemsAdded} ${entityType.toLowerCase()} en la base de datos.` });
            setAnalysisResult(null); // Clear results after saving
        } catch(e) {
             console.error("Error al guardar en DB:", e);
             toast({ title: 'Error al Guardar', description: `No se pudieron guardar los datos. ${e instanceof Error ? e.message : ''}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderAnalysisResult = () => {
        if (!analysisResult) return null;
        let summaryText = '';
        let vehicleData: (ExtractedGenericVehicle | ExtractedVehicleForMigration)[] = [];

        if (analysisResult.type === 'generic') {
            summaryText = `Se encontraron ${analysisResult.vehicles.length} vehículos y ${analysisResult.services.length} servicios.`;
            vehicleData = analysisResult.vehicles;
        } else if (analysisResult.type === 'vehicles') {
            summaryText = `Se encontraron ${analysisResult.vehicles.length} vehículos.`;
            vehicleData = analysisResult.vehicles;
        } else if (analysisResult.type === 'products') {
            summaryText = `Se encontraron ${analysisResult.products.length} productos.`;
        }

        return (
             <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-500" /> ¡Análisis Completo!</CardTitle>
                    <CardDescription>{summaryText} Revisa los datos a continuación y confirma para guardar.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(analysisResult.type === 'generic' || analysisResult.type === 'vehicles') && vehicleData.length > 0 && (
                        <div className="rounded-md border h-64 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted">
                                    <TableRow>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Marca</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Año</TableHead>
                                        <TableHead>Propietario</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vehicleData.map((v, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-semibold">{(v as ExtractedGenericVehicle).licensePlate || 'N/A'}</TableCell>
                                            <TableCell>{v.make}</TableCell>
                                            <TableCell>{v.model}</TableCell>
                                            <TableCell>{v.year}</TableCell>
                                            <TableCell>{v.ownerName}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                     {(analysisResult.type === 'products') && analysisResult.products.length > 0 && (
                        <p>Vista previa para productos aún no implementada.</p>
                    )}
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleConfirmAndSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                            Confirmar y Guardar en Base de Datos
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleAnalyze}>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>1. Cargar Archivo</CardTitle>
                    <CardDescription>Sube un archivo <code>.xlsx</code> con tu historial.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                            {isAnalyzing ? (
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
                             <Input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isAnalyzing} />
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
                    <Card><CardHeader><CardTitle>Migración de Vehículos</CardTitle><CardDescription>Usa esta opción si tu hoja contiene solo información de vehículos (nombre, tel, marca, modelo, año, y **placa**).</CardDescription></CardHeader><CardContent><Button type="button" className="w-full" onClick={(e) => handleAnalyze(e as any)} disabled={!fileContent || isAnalyzing}>{isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4"/>} Analizar Datos de Vehículos</Button></CardContent></Card>
                </TabsContent>
                <TabsContent value="productos">
                    <Card><CardHeader><CardTitle>Migración de Productos</CardTitle><CardDescription>Usa esta opción si tu hoja contiene solo información de productos (código, nombre, existencias, precios).</CardDescription></CardHeader><CardContent><Button type="button" className="w-full" onClick={(e) => handleAnalyze(e as any)} disabled={!fileContent || isAnalyzing}>{isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4"/>} Analizar Datos de Productos</Button></CardContent></Card>
                </TabsContent>
                <TabsContent value="ia">
                    <Card><CardHeader><CardTitle>Migración con IA</CardTitle><CardDescription>La IA analizará la hoja para extraer vehículos (**incluyendo placas**) e historial de servicios de forma automática.</CardDescription></CardHeader><CardContent><Button type="button" className="w-full" onClick={(e) => handleAnalyze(e as any)} disabled={!fileContent || isAnalyzing}>{isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4"/>} Analizar con IA</Button></CardContent></Card>
                </TabsContent>
            </Tabs>
             
            {isAnalyzing && (
                <Card className="mt-6">
                    <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-3"/>
                        <p>La IA está analizando los datos, por favor espere...</p>
                    </CardContent>
                </Card>
            )}

            {analysisResult && renderAnalysisResult()}

        </div>
      </div>
    );
}
