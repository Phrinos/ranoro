
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, BrainCircuit, Loader2, CheckCircle, Database, Briefcase, FileUp, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { inventoryService, serviceService } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import type { Vehicle, InventoryItem, ServiceRecord } from '@/types';

type MigrationType = 'operaciones' | 'productos';
type AnalysisResult = {
    type: MigrationType;
    vehicles: Vehicle[];
    services: ServiceRecord[];
    products?: InventoryItem[];
}

export function MigracionPageContent() {
    const [pastedText, setPastedText] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [migrationType, setMigrationType] = useState<MigrationType>('operaciones');
    
    const [existingVehicles, setExistingVehicles] = useState<Vehicle[]>([]);
    const [existingInventory, setExistingInventory] = useState<InventoryItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const { toast } = useToast();

    useEffect(() => {
        setIsLoadingData(true);
        const unsubs = [
            inventoryService.onVehiclesUpdate(setExistingVehicles),
            inventoryService.onItemsUpdate((items) => {
                setExistingInventory(items);
                setIsLoadingData(false);
            }),
        ];
        return () => unsubs.forEach(unsub => unsub());
    }, []);
    
    const handlePastedTextChange = (text: string) => {
        setPastedText(text);
        setAnalysisResult(null);
    }
    
    const runAnalysis = async (csvContent: string) => {
        if (!csvContent) {
            toast({ title: 'No hay datos', description: 'El contenido para analizar está vacío.', variant: 'destructive' });
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            toast({ title: "Análisis no disponible", description: "La funcionalidad de migración de datos con IA ha sido deshabilitada.", variant: "destructive" });
        } catch (e) {
            console.error("Error en el análisis:", e);
            toast({ title: 'Error en Análisis', description: `La IA no pudo procesar los datos. ${e instanceof Error ? e.message : ''}`, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            toast({ title: "Funcionalidad no disponible", description: "La importación desde archivos Excel está temporalmente deshabilitada.", variant: "default" });
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target?.result;
            let csvText = '';
            
            try {
                if (file.name.endsWith('.csv') && typeof data === 'string') {
                    csvText = data;
                } else {
                     toast({ title: "Error de Formato", description: "No se pudo procesar el archivo. Intente con CSV.", variant: "destructive" });
                     return;
                }
    
                runAnalysis(csvText);
                
            } catch (error) {
                console.error("Error processing file:", error);
                toast({ title: "Error al Procesar", description: `No se pudo leer el contenido del archivo. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
            }
        };
        
        reader.onerror = () => toast({ title: "Error de Lectura", description: "No se pudo leer el archivo.", variant: "destructive" });
        
        if (file.name.endsWith('.csv')) {
             reader.readAsText(file);
        } else {
             toast({ title: "Formato no Soportado", description: "Por favor, suba un archivo .csv.", variant: "destructive" });
        }
        
        e.target.value = '';
    };


    const handleAnalyzeFromText = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        runAnalysis(pastedText);
    };

    const handleConfirmAndSave = async () => {
        if (!analysisResult) return toast({ title: 'No hay resultado', description: 'Realiza un análisis primero.', variant: 'destructive' });
        setIsSaving(true);
        let itemsAdded = 0;
        
        try {
            if (analysisResult.type === 'operaciones' && (analysisResult.services.length > 0 || analysisResult.vehicles.length > 0)) {
                await serviceService.saveMigratedServices(analysisResult.services as any, analysisResult.vehicles as any);
                itemsAdded = (analysisResult.vehicles?.length || 0) + (analysisResult.services?.length || 0);
            } else if (analysisResult.type === 'productos' && analysisResult.products) {
                if (analysisResult.products.length > 0) {
                    for (const product of analysisResult.products) {
                        await inventoryService.addItem(product as any);
                        itemsAdded++;
                    }
                }
            }
            toast({ title: "¡Migración Exitosa!", description: `Se guardaron ${itemsAdded} registros nuevos en la base de datos.` });
            setAnalysisResult(null);
            setPastedText('');
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
        if(analysisResult.type === 'operaciones') summaryText = `Se encontraron ${analysisResult.vehicles.length} vehículos y ${analysisResult.services.length} servicios nuevos. Los registros existentes fueron omitidos.`;
        if (analysisResult.type === 'productos' && analysisResult.products) summaryText = `Se encontraron ${analysisResult.products.length} productos nuevos. Los registros existentes fueron omitidos.`;
        
        const renderDate = (dateString: string | undefined) => {
            if (!dateString) return 'N/A';
            const possibleFormats = ['M/d/yy', 'MM/dd/yy', 'M-d-yy', 'MM-dd-yy', 'yyyy-MM-dd', 'dd/MM/yyyy'];
            for (const fmt of possibleFormats) {
                const parsed = parse(dateString, fmt, new Date());
                if(isValid(parsed)) return format(parsed, 'dd MMM, yyyy');
            }
            return dateString;
        }
        
        const hasVehicles = analysisResult.vehicles && analysisResult.vehicles.length > 0;
        const hasServices = analysisResult.services && analysisResult.services.length > 0;
        const hasProducts = analysisResult.products && analysisResult.products.length > 0;
        const hasDataToSave = hasVehicles || hasServices || hasProducts;

        return (
             <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-500" /> ¡Análisis Completo!</CardTitle>
                    <CardDescription>{summaryText} Revisa los datos a continuación y confirma para guardar.</CardDescription>
                </CardHeader>
                <CardContent>
                    {hasVehicles && (
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Vehículos Detectados</h3>
                            <div className="rounded-md border h-48 overflow-auto">
                                <Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>Placa</TableHead><TableHead>Marca</TableHead><TableHead>Modelo</TableHead><TableHead>Año</TableHead><TableHead>Propietario</TableHead></TableRow></TableHeader><TableBody>{analysisResult.vehicles.map((v, i) => ( <TableRow key={i}><TableCell className="font-semibold">{v.licensePlate || 'N/A'}</TableCell><TableCell>{v.make}</TableCell><TableCell>{v.model}</TableCell><TableCell>{v.year}</TableCell><TableCell>{v.ownerName}</TableCell></TableRow> ))}</TableBody></Table>
                            </div>
                        </div>
                    )}
                    {hasServices && (
                         <div className="mb-4">
                            <h3 className="font-semibold mb-2">Servicios Detectados</h3>
                            <div className="rounded-md border h-48 overflow-auto">
                               <Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>Placa</TableHead><TableHead>Fecha</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader><TableBody>{analysisResult.services.map((s, i) => ( <TableRow key={i}><TableCell>{(s as any).licensePlate ?? ''}</TableCell><TableCell>{renderDate(s.serviceDate)}</TableCell><TableCell>{s.description}</TableCell><TableCell className="text-right">{formatCurrency((s as any).totalCost || 0)}</TableCell></TableRow> ))}</TableBody></Table>
                            </div>
                        </div>
                    )}
                     {hasProducts && analysisResult.products && (
                        <div className="rounded-md border h-64 overflow-auto">
                           <Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>SKU</TableHead><TableHead>Nombre</TableHead><TableHead>Marca</TableHead><TableHead>Categoría</TableHead><TableHead>Cantidad</TableHead><TableHead>Precio Compra</TableHead><TableHead>Precio Venta</TableHead></TableRow></TableHeader><TableBody>{analysisResult.products.map((p, i) => ( <TableRow key={i}><TableCell>{p.sku || 'N/A'}</TableCell><TableCell>{p.name}</TableCell><TableCell>{p.brand}</TableCell><TableCell>{typeof p.category === "string" ? p.category : (p.category?.name ?? "N/A")}</TableCell><TableCell>{p.quantity}</TableCell><TableCell>{formatCurrency(p.unitPrice || 0)}</TableCell><TableCell>{formatCurrency(p.sellingPrice || 0)}</TableCell></TableRow> ))}</TableBody></Table>
                        </div>
                    )}
                    {hasDataToSave ? (
                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleConfirmAndSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                Confirmar y Guardar en Base de Datos
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-4 text-center text-muted-foreground">
                            No se encontraron registros nuevos para guardar.
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
      <div className="space-y-6">
        <form onSubmit={handleAnalyzeFromText}>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>1. Seleccionar Tipo y Cargar Datos</CardTitle>
                    <CardDescription>Elige el tipo de migración y luego pega el texto o sube un archivo de hoja de cálculo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Select value={migrationType} onValueChange={(v) => setMigrationType(v as MigrationType)}>
                        <SelectTrigger className="w-full md:w-1/2 bg-card">
                            <SelectValue placeholder="Seleccionar tipo de migración" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="operaciones"><div className="flex items-center gap-2"><Briefcase className="h-4 w-4"/>Operaciones (Vehículos y Servicios)</div></SelectItem>
                            <SelectItem value="productos"><div className="flex items-center gap-2"><Package className="h-4 w-4"/>Solo Productos de Inventario</div></SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="space-y-2">
                             <label htmlFor="paste-area" className="flex items-center gap-2 font-medium">
                                <FileText className="h-4 w-4"/> Opción A: Pegar Texto
                            </label>
                            <Textarea
                                id="paste-area"
                                placeholder="Copia y pega aquí tus datos..."
                                className="h-44 font-mono text-xs"
                                value={pastedText}
                                onChange={(e) => handlePastedTextChange(e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <label htmlFor="file-upload" className="flex items-center gap-2 font-medium">
                                <FileUp className="h-4 w-4"/> Opción B: Subir Archivo (Análisis Automático)
                            </label>
                            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastra y suelta</p>
                                    <p className="text-xs text-gray-500">CSV (XLSX deshabilitado)</p>
                                </div>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".csv" />
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>2. Analizar y Guardar</CardTitle>
                    <CardDescription>Usa este botón para analizar el texto pegado. La subida de archivo inicia el análisis automáticamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button type="submit" className="w-full" disabled={!pastedText || isAnalyzing || isLoadingData}>
                        {isAnalyzing || isLoadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4"/>} 
                        {isLoadingData ? 'Cargando datos existentes...' : (isAnalyzing ? 'Analizando...' : 'Analizar Texto Pegado con IA')}
                    </Button>
                </CardContent>
            </Card>
        </form>
             
        {(isAnalyzing || isLoadingData) && (
            <Card className="mt-6">
                <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-3"/>
                    <p>{isLoadingData ? 'Cargando datos existentes para comparación...' : 'La IA está analizando los datos, por favor espere...'}</p>
                </CardContent>
            </Card>
        )}

        {analysisResult && renderAnalysisResult()}

      </div>
    );
}
