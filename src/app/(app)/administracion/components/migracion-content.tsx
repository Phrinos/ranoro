
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Package, BrainCircuit, Upload, Loader2, CheckCircle, AlertTriangle, Database, Wrench, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExtractedVehicleForMigration } from '@/ai/flows/vehicle-migration-flow';
import type { ExtractedProduct } from '@/ai/flows/product-migration-flow';
import type { ExtractedService } from '@/ai/flows/service-migration-flow';
import { migrateVehicles } from '@/ai/flows/vehicle-migration-flow';
import { migrateProducts } from '@/ai/flows/product-migration-flow';
import { migrateServices } from '@/ai/flows/service-migration-flow';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';
import { inventoryService, operationsService } from '@/lib/services';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { formatCurrency } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { Label } from '@/components/ui/label';

type AnalysisResult = | { type: 'vehicles'; vehicles: ExtractedVehicleForMigration[]; } | { type: 'products'; products: ExtractedProduct[]; } | { type: 'services'; services: ExtractedService[]; };

type Mapping = Record<string, string>;

const VEHICLE_FIELDS = [
    { key: 'licensePlate', label: 'Placa (Obligatorio)', example: 'ABC-123' },
    { key: 'make', label: 'Marca', example: 'Nissan' },
    { key: 'model', label: 'Modelo', example: 'Sentra' },
    { key: 'year', label: 'Año', example: '2020' },
    { key: 'ownerName', label: 'Propietario', example: 'Juan Pérez' },
    { key: 'ownerPhone', label: 'Teléfono', example: '555-1234' },
];

const PRODUCT_FIELDS = [
    { key: 'name', label: 'Nombre (Obligatorio)', example: 'Filtro de Aceite' },
    { key: 'sku', label: 'SKU / Código', example: 'FA-001' },
    { key: 'quantity', label: 'Cantidad', example: '50' },
    { key: 'unitPrice', label: 'Precio Compra', example: '120.50' },
    { key: 'sellingPrice', label: 'Precio Venta', example: '180.00' },
];

const SERVICE_FIELDS = [
    { key: 'vehicleLicensePlate', label: 'Placa Vehículo (Obligatorio)', example: 'XYZ-456' },
    { key: 'serviceDate', label: 'Fecha Servicio (Obligatorio)', example: '15/07/2023' },
    { key: 'description', label: 'Descripción (Obligatorio)', example: 'Cambio de aceite y filtro' },
    { key: 'totalCost', label: 'Costo Total (Obligatorio)', example: '850.00' },
];


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
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'productos' | 'servicios'>('vehiculos');
    
    // New state for column mapping
    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Mapping>({});
    
    const { toast } = useToast();
    
    const getCurrentFields = () => {
        switch(activeTab) {
            case 'vehiculos': return VEHICLE_FIELDS;
            case 'productos': return PRODUCT_FIELDS;
            case 'servicios': return SERVICE_FIELDS;
            default: return [];
        }
    };
    
    const autoMapColumns = (headers: string[]) => {
        const mapping: Mapping = {};
        const fields = getCurrentFields();
        fields.forEach(field => {
            const lowerKey = field.key.toLowerCase();
            const foundHeader = headers.find(h => h.toLowerCase().replace(/ /g,'').includes(lowerKey));
            if (foundHeader) {
                mapping[field.key] = foundHeader;
            }
        });
        setColumnMapping(mapping);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setFileName(file.name);
        setAnalysisResult(null);

        try {
            const data = await file.arrayBuffer();
            const wb = xlsx.read(data);
            setWorkbook(wb);
            setSheetNames(wb.SheetNames);
            if(wb.SheetNames.length > 0){
                handleSheetChange(wb.SheetNames[0], wb);
            }
        } catch (e) {
            console.error("Error al leer el archivo:", e);
            setError("No se pudo leer el archivo. Asegúrese de que sea un .xlsx válido.");
        }
    };

    const handleSheetChange = (sheetName: string, wb?: any) => {
        const currentWorkbook = wb || workbook;
        if (!currentWorkbook) return;

        setSelectedSheet(sheetName);
        const worksheet = currentWorkbook.Sheets[sheetName];
        
        // Extract headers
        const headers: any[] = xlsx.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
        setDetectedHeaders(headers.map(String));
        
        const csvContent = xlsx.utils.sheet_to_csv(worksheet);
        setFileContent(csvContent);
        setAnalysisResult(null);
        autoMapColumns(headers.map(String));
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
            const mappingJson = JSON.stringify(columnMapping);
            if (activeTab === 'vehiculos') {
                const rawResult = await migrateVehicles({ csvContent: fileContent });
                result = { ...rawResult, type: 'vehicles' as const };
            } else if (activeTab === 'productos') {
                const rawResult = await migrateProducts({ csvContent: fileContent });
                result = { ...rawResult, type: 'products' as const };
            } else { // servicios
                const rawResult = await migrateServices({ csvContent: fileContent, mapping: mappingJson });
                result = { ...rawResult, type: 'services' as const };
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
            if (analysisResult.type === 'vehicles') {
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
            } else if (analysisResult.type === 'services') {
                entityType = 'Servicios';
                 if (analysisResult.services && analysisResult.services.length > 0) {
                    await operationsService.saveMigratedServices(analysisResult.services);
                    itemsAdded = analysisResult.services.length;
                 }
            }
            toast({ title: "¡Migración Exitosa!", description: `Se guardaron ${itemsAdded} ${entityType.toLowerCase()} en la base de datos.` });
            setAnalysisResult(null);
        } catch(e) {
             console.error("Error al guardar en DB:", e);
             toast({ title: 'Error al Guardar', description: `No se pudieron guardar los datos. ${e instanceof Error ? e.message : ''}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleMappingChange = (fieldKey: string, header: string) => {
        const valueToSet = header === 'none' ? '' : header;
        setColumnMapping(prev => ({...prev, [fieldKey]: valueToSet}));
    };
    
    const renderAnalysisResult = () => {
        if (!analysisResult) return null;
        
        let summaryText = '';
        if (analysisResult.type === 'vehicles') summaryText = `Se encontraron ${analysisResult.vehicles.length} vehículos.`;
        if (analysisResult.type === 'products') summaryText = `Se encontraron ${analysisResult.products.length} productos.`;
        if (analysisResult.type === 'services') summaryText = `Se encontraron ${analysisResult.services.length} servicios.`;
        
        const renderDate = (dateString: string) => {
            const possibleFormats = ['M/d/yy', 'MM/dd/yy', 'M-d-yy', 'MM-dd-yy', 'yyyy-MM-dd'];
            for (const fmt of possibleFormats) {
                const parsed = parse(dateString, fmt, new Date());
                if(isValid(parsed)) return format(parsed, 'dd MMM, yyyy');
            }
            return dateString; // fallback
        }

        return (
             <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-500" /> ¡Análisis Completo!</CardTitle>
                    <CardDescription>{summaryText} Revisa los datos a continuación y confirma para guardar.</CardDescription>
                </CardHeader>
                <CardContent>
                    {analysisResult.type === 'vehicles' && analysisResult.vehicles.length > 0 && (
                        <div className="rounded-md border h-64 overflow-auto">
                            <Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>Placa</TableHead><TableHead>Marca</TableHead><TableHead>Modelo</TableHead><TableHead>Año</TableHead><TableHead>Propietario</TableHead></TableRow></TableHeader><TableBody>{analysisResult.vehicles.map((v, i) => ( <TableRow key={i}><TableCell className="font-semibold">{v.licensePlate || 'N/A'}</TableCell><TableCell>{v.make}</TableCell><TableCell>{v.model}</TableCell><TableCell>{v.year}</TableCell><TableCell>{v.ownerName}</TableCell></TableRow> ))}</TableBody></Table>
                        </div>
                    )}
                     {analysisResult.type === 'products' && analysisResult.products.length > 0 && (
                        <div className="rounded-md border h-64 overflow-auto">
                           <Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>SKU</TableHead><TableHead>Nombre</TableHead><TableHead>Cantidad</TableHead><TableHead>Precio Compra</TableHead><TableHead>Precio Venta</TableHead></TableRow></TableHeader><TableBody>{analysisResult.products.map((p, i) => ( <TableRow key={i}><TableCell>{p.sku || 'N/A'}</TableCell><TableCell>{p.name}</TableCell><TableCell>{p.quantity}</TableCell><TableCell>{formatCurrency(p.unitPrice)}</TableCell><TableCell>{formatCurrency(p.sellingPrice)}</TableCell></TableRow> ))}</TableBody></Table>
                        </div>
                    )}
                    {analysisResult.type === 'services' && analysisResult.services.length > 0 && (
                        <div className="rounded-md border h-64 overflow-auto">
                           <Table><TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>Placa</TableHead><TableHead>Fecha</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader><TableBody>{analysisResult.services.map((s, i) => ( <TableRow key={i}><TableCell>{s.vehicleLicensePlate}</TableCell><TableCell>{renderDate(s.serviceDate)}</TableCell><TableCell>{s.description}</TableCell><TableCell className="text-right">{formatCurrency(s.totalCost)}</TableCell></TableRow> ))}</TableBody></Table>
                        </div>
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
        <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-lg">
                <CardHeader><CardTitle>1. Cargar Archivo</CardTitle><CardDescription>Sube un archivo <code>.xlsx</code> con tu historial.</CardDescription></CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50">
                            {fileName ? ( <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center"><CheckCircle className="w-8 h-8 mb-4 text-green-500"/><p className="mb-2 text-sm text-foreground"><span className="font-semibold">Archivo cargado:</span></p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</p></div> ) : ( <div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-8 h-8 mb-4 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Haz clic para subir</span> o arrastra</p><p className="text-xs text-muted-foreground">Sólo archivos .XLSX</p></div> )}
                             <Input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} />
                        </label>
                    </div>
                    {sheetNames.length > 0 && (
                        <Select onValueChange={(value) => handleSheetChange(value)} value={selectedSheet} className="mt-4">
                            <SelectTrigger className="mt-4"><SelectValue placeholder="Seleccione una hoja" /></SelectTrigger>
                            <SelectContent>{sheetNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vehiculos"><Car className="mr-2 h-4 w-4"/>Vehículos</TabsTrigger>
                    <TabsTrigger value="productos"><Package className="mr-2 h-4 w-4"/>Productos</TabsTrigger>
                    <TabsTrigger value="servicios"><Wrench className="mr-2 h-4 w-4"/>Servicios</TabsTrigger>
                </TabsList>
            </Tabs>
            
             <form onSubmit={handleAnalyze}>
                <Card>
                    <CardHeader><CardTitle>2. Mapeo de Columnas</CardTitle><CardDescription>Indica qué columna de tu archivo corresponde a cada campo del sistema.</CardDescription></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getCurrentFields().map(field => (
                            <div key={field.key} className="space-y-1">
                                <Label>{field.label}</Label>
                                <Select value={columnMapping[field.key] || ''} onValueChange={(value) => handleMappingChange(field.key, value)}>
                                    <SelectTrigger><SelectValue placeholder={`Seleccionar: ${field.example}`} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- No Mapear --</SelectItem>
                                        {detectedHeaders.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                 <Card className="mt-4">
                    <CardHeader><CardTitle>3. Analizar y Guardar</CardTitle><CardDescription>La IA usará tu mapeo para extraer los datos. Luego podrás revisarlos antes de guardarlos.</CardDescription></CardHeader>
                    <CardContent>
                        <Button type="submit" className="w-full" disabled={!fileContent || isAnalyzing}>
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4"/>} Analizar Datos con IA
                        </Button>
                    </CardContent>
                </Card>
             </form>
             
            {isAnalyzing && (
                <Card className="mt-6">
                    <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-3"/><p>La IA está analizando los datos, por favor espere...</p>
                    </CardContent>
                </Card>
            )}

            {analysisResult && renderAnalysisResult()}

        </div>
      </div>
    );
}
