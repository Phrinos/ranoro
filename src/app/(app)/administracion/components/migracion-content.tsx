
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Package, BrainCircuit, Loader2, CheckCircle, Database, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExtractedVehicleForMigration } from '@/ai/flows/vehicle-migration-flow';
import type { ExtractedProduct } from '@/ai/flows/product-migration-flow';
import type { ExtractedService } from '@/ai/flows/service-migration-flow';
import { migrateVehicles } from '@/ai/flows/vehicle-migration-flow';
import { migrateProducts } from '@/ai/flows/product-migration-flow';
import { migrateServices } from '@/ai/flows/service-migration-flow';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, operationsService } from '@/lib/services';
import type { VehicleFormValues } from '@/app/(app)/vehiculos/components/vehicle-form';
import { formatCurrency } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AnalysisResult = | { type: 'vehicles'; vehicles: ExtractedVehicleForMigration[]; } | { type: 'products'; products: ExtractedProduct[]; } | { type: 'services'; services: ExtractedService[]; };

export function MigracionPageContent() {
    const [pastedText, setPastedText] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'productos' | 'servicios'>('vehiculos');
    
    const { toast } = useToast();
    
    const handlePastedTextChange = (text: string) => {
        setPastedText(text);
        setAnalysisResult(null);
    }

    const handleAnalyze = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!pastedText) {
            toast({ title: 'No hay datos', description: 'Por favor pegue texto para analizar.', variant: 'destructive' });
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            let result;
            if (activeTab === 'vehiculos') {
                const rawResult = await migrateVehicles({ csvContent: pastedText });
                result = { ...rawResult, type: 'vehicles' as const };
            } else if (activeTab === 'productos') {
                const rawResult = await migrateProducts({ csvContent: pastedText });
                result = { ...rawResult, type: 'products' as const };
            } else { // servicios
                const rawResult = await migrateServices({ csvContent: pastedText });
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
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vehiculos"><Car className="mr-2 h-4 w-4"/>Vehículos</TabsTrigger>
                <TabsTrigger value="productos"><Package className="mr-2 h-4 w-4"/>Productos</TabsTrigger>
                <TabsTrigger value="servicios"><Wrench className="mr-2 h-4 w-4"/>Servicios</TabsTrigger>
            </TabsList>
        </Tabs>

        <form onSubmit={handleAnalyze}>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>1. Pegar Datos</CardTitle>
                    <CardDescription>Pega aquí el texto directamente desde tu hoja de cálculo (Excel, Google Sheets, etc.).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        id="paste-area"
                        placeholder="Copia y pega aquí tus datos..."
                        className="h-44 font-mono text-xs"
                        value={pastedText}
                        onChange={(e) => handlePastedTextChange(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>2. Analizar y Guardar</CardTitle>
                    <CardDescription>La IA analizará el texto pegado. Luego podrás revisar los datos antes de guardarlos en el sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button type="submit" className="w-full" disabled={!pastedText || isAnalyzing}>
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
    );
}
