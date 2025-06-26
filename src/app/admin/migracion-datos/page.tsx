
"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, CheckCircle, AlertTriangle, Car, Wrench, Package, BrainCircuit } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { migrateData, type ExtractedVehicle, type ExtractedService } from '@/ai/flows/data-migration-flow';
import { migrateVehicles, type ExtractedVehicleForMigration } from '@/ai/flows/vehicle-migration-flow';
import { migrateProducts, type ExtractedProduct } from '@/ai/flows/product-migration-flow';

import { 
  placeholderVehicles, 
  placeholderServiceRecords, 
  placeholderTechnicians, 
  persistToFirestore,
  placeholderInventory,
  placeholderCategories,
  placeholderSuppliers
} from '@/lib/placeholder-data';
import type { Vehicle, ServiceRecord, InventoryItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type ActiveTab = 'vehiculos' | 'productos' | 'ia';

type MigrationResult =
  | { type: 'generic'; vehicles: ExtractedVehicle[]; services: ExtractedService[]; vehiclesAdded: number; servicesAdded: number; }
  | { type: 'vehicles'; vehicles: ExtractedVehicleForMigration[]; vehiclesAdded: number; }
  | { type: 'products'; products: ExtractedProduct[]; productsAdded: number; };

export default function MigracionDatosPage() {
  const [workbook, setWorkbook] = useState<any | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('vehiculos');
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        toast({ title: "Archivo no válido", description: "Por favor, seleccione un archivo con formato .xlsx", variant: "destructive" });
        resetState();
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          setFileName(file.name);
          setError(null);
          setMigrationResult(null);

          const firstSheetCsv = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet]);
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

  const handleSheetChange = async (sheetName: string) => {
    if (!workbook) return;
    const XLSX = await import('xlsx');
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
    setError(null);
    setMigrationResult(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fileContent) {
      toast({ title: "No hay datos para importar", description: "Por favor, seleccione un archivo y una hoja.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setError(null);
    setMigrationResult(null);

    try {
      if (activeTab === 'vehiculos') {
        const result = await migrateVehicles({ csvContent: fileContent });
        let vehiclesAddedCount = 0;
        result.vehicles.forEach((vehicleData, index) => {
          const newVehicle: Vehicle = {
            id: `VEH_MIG_${index}_${Date.now().toString(36)}`,
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            ownerName: vehicleData.ownerName,
            ownerPhone: vehicleData.ownerPhone,
            licensePlate: 'SIN_PLACA_' + index, // Assign temporary plate
          };
          placeholderVehicles.push(newVehicle);
          vehiclesAddedCount++;
        });
        await persistToFirestore(['vehicles']);
        setMigrationResult({ type: 'vehicles', vehicles: result.vehicles, vehiclesAdded: vehiclesAddedCount });
        toast({ title: "Migración de Vehículos Completada", description: `Se procesaron ${vehiclesAddedCount} vehículos.` });
      } else if (activeTab === 'productos') {
        const result = await migrateProducts({ csvContent: fileContent });
        let productsAddedCount = 0;
        result.products.forEach(productData => {
            const skuExists = placeholderInventory.some(p => p.sku && productData.sku && p.sku.toLowerCase() === productData.sku.toLowerCase());
            if (productData.sku && skuExists) return;

            const newProduct: InventoryItem = {
                id: `PROD_MIG_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: productData.name,
                sku: productData.sku || '',
                quantity: productData.quantity,
                unitPrice: productData.unitPrice,
                sellingPrice: productData.sellingPrice,
                category: 'Importado',
                supplier: 'Varios',
                lowStockThreshold: 5,
                isService: false,
                unitType: 'units',
            };
            placeholderInventory.push(newProduct);
            productsAddedCount++;
        });

        if (!placeholderCategories.some(c => c.name === 'Importado')) placeholderCategories.push({id: 'cat_mig', name: 'Importado'});
        if (!placeholderSuppliers.some(s => s.name === 'Varios')) placeholderSuppliers.push({id: 'sup_mig', name: 'Varios'});
        
        await persistToFirestore(['inventory', 'categories', 'suppliers']);
        setMigrationResult({ type: 'products', products: result.products, productsAdded: productsAddedCount });
        toast({ title: "Migración de Productos Completada", description: `Se procesaron ${productsAddedCount} productos.` });
      } else { // 'ia' tab
        const result = await migrateData({ csvContent: fileContent });
        let vehiclesAddedCount = 0;
        let servicesAddedCount = 0;

        result.vehicles.forEach((vehicleData, index) => {
          const plateExists = placeholderVehicles.some(v => v.licensePlate.toLowerCase() === vehicleData.licensePlate.toLowerCase());
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

        result.services.forEach(serviceData => {
          const vehicle = placeholderVehicles.find(v => v.licensePlate.toLowerCase() === serviceData.vehicleLicensePlate.toLowerCase());
          if (vehicle) {
            const newService: ServiceRecord = {
              id: `MIG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              vehicleId: vehicle.id,
              serviceDate: serviceData.serviceDate,
              description: serviceData.description,
              totalCost: serviceData.totalCost,
              status: 'Completado',
              technicianId: placeholderTechnicians.length > 0 ? placeholderTechnicians[0].id : 'default_tech',
              suppliesUsed: [],
              serviceProfit: serviceData.totalCost * 0.4,
            };
            placeholderServiceRecords.push(newService);
            servicesAddedCount++;
          }
        });
        
        await persistToFirestore(['vehicles', 'serviceRecords']);
        setMigrationResult({ ...result, vehiclesAdded: vehiclesAddedCount, servicesAdded: servicesAddedCount, type: 'generic' });
        toast({ title: "Migración Completada", description: `Se procesaron ${vehiclesAddedCount} vehículos y ${servicesAddedCount} servicios.` });
      }

    } catch (e) {
      console.error(e);
      setError("La IA no pudo procesar el archivo. Revisa el formato e inténtalo de nuevo.");
      toast({ title: "Error de Migración", description: "Hubo un problema al procesar el archivo con la IA.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="container mx-auto py-8">
      <PageHeader title="Migración de Datos" description="Importa datos históricos desde un archivo XLSX." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit}>
            <Card className="shadow-lg">
              <CardHeader><CardTitle>1. Cargar Archivo</CardTitle><CardDescription>Sube un archivo <code>.xlsx</code> con tu historial.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-foreground mb-1">Seleccionar archivo XLSX</label>
                  <Input id="file-upload" type="file" accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" disabled={isUploading}/>
                  {fileName && <p className="mt-2 text-sm text-muted-foreground">Archivo: {fileName}</p>}
                </div>
                {sheetNames.length > 0 && (
                   <div className="space-y-2">
                    <label htmlFor="sheet-select" className="block text-sm font-medium text-foreground">Seleccionar hoja</label>
                    <Select value={selectedSheet} onValueChange={handleSheetChange}>
                        <SelectTrigger id="sheet-select"><SelectValue placeholder="Seleccione una hoja" /></SelectTrigger>
                        <SelectContent>{sheetNames.map(name => (<SelectItem key={name} value={name}>{name}</SelectItem>))}</SelectContent>
                    </Select>
                   </div>
                )}
                <Button type="submit" className="w-full" disabled={!fileContent || isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isUploading ? "Procesando con IA..." : "Iniciar Importación"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="vehiculos"><Car className="mr-2 h-4 w-4"/>Vehículos</TabsTrigger>
              <TabsTrigger value="productos"><Package className="mr-2 h-4 w-4"/>Productos</TabsTrigger>
              <TabsTrigger value="ia"><BrainCircuit className="mr-2 h-4 w-4"/>Análisis IA</TabsTrigger>
            </TabsList>
            <TabsContent value="vehiculos">
              <Card className="shadow-lg min-h-[300px]">
                <CardHeader><CardTitle>Importar Vehículos</CardTitle><CardDescription>Columnas requeridas: <strong>nombre, telefono, marca, modelo, año</strong>.</CardDescription></CardHeader>
                <CardContent>
                  {migrationResult?.type === 'vehicles' && (
                    <div className="space-y-4">
                      <div className="text-center text-green-700 bg-green-100 p-4 rounded-lg"><p>¡Proceso Completado! Se añadieron <span className="font-bold">{migrationResult.vehiclesAdded}</span> vehículos nuevos.</p></div>
                      <div className="rounded-md border max-h-96 overflow-y-auto">
                        <Table><TableHeader><TableRow><TableHead>Vehículo</TableHead><TableHead>Propietario</TableHead></TableRow></TableHeader>
                          <TableBody>{migrationResult.vehicles.map((v, i) => (<TableRow key={`v-${i}`}><TableCell>{v.make} {v.model} ({v.year})</TableCell><TableCell>{v.ownerName}</TableCell></TableRow>))}</TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="productos">
              <Card className="shadow-lg min-h-[300px]">
                <CardHeader><CardTitle>Importar Productos</CardTitle><CardDescription>Columnas requeridas: <strong>codigo, nombre, existencias, precio de compra, precio de venta</strong>.</CardDescription></CardHeader>
                <CardContent>
                   {migrationResult?.type === 'products' && (
                    <div className="space-y-4">
                      <div className="text-center text-green-700 bg-green-100 p-4 rounded-lg"><p>¡Proceso Completado! Se añadieron <span className="font-bold">{migrationResult.productsAdded}</span> productos nuevos.</p></div>
                      <div className="rounded-md border max-h-96 overflow-y-auto">
                        <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Venta</TableHead></TableRow></TableHeader>
                          <TableBody>{migrationResult.products.map((p, i) => (<TableRow key={`p-${i}`}><TableCell>{p.name}</TableCell><TableCell>{p.sku}</TableCell><TableCell className="text-right">{p.quantity}</TableCell><TableCell className="text-right">{formatCurrency(p.unitPrice)}</TableCell><TableCell className="text-right">{formatCurrency(p.sellingPrice)}</TableCell></TableRow>))}</TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ia">
              <Card className="shadow-lg min-h-[300px]">
                  <CardHeader><CardTitle>Análisis con IA</CardTitle><CardDescription>La IA intentará extraer datos de vehículos y servicios de forma automática.</CardDescription></CardHeader>
                  <CardContent>
                      {isUploading && <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p>Analizando datos...</p></div>}
                      {error && <div className="flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive/90 p-8 rounded-lg"><AlertTriangle className="h-12 w-12 mb-4" /><p>{error}</p></div>}
                      {migrationResult?.type === 'generic' && (
                          <div className="space-y-4">
                              <div className="text-center text-green-700 bg-green-100 p-4 rounded-lg"><p>¡Proceso Completado! Se añadieron <span className="font-bold">{migrationResult.vehiclesAdded}</span> vehículos y <span className="font-bold">{migrationResult.servicesAdded}</span> servicios.</p></div>
                              <Tabs defaultValue="vehicles">
                                  <TabsList className="grid w-full grid-cols-2">
                                      <TabsTrigger value="vehicles"><Car className="mr-2 h-4 w-4"/> Vehículos ({migrationResult.vehicles.length})</TabsTrigger>
                                      <TabsTrigger value="services"><Wrench className="mr-2 h-4 w-4"/> Servicios ({migrationResult.services.length})</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="vehicles">
                                      <div className="rounded-md border max-h-96 overflow-y-auto">
                                          <Table><TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Vehículo</TableHead><TableHead>Propietario</TableHead></TableRow></TableHeader><TableBody>{migrationResult.vehicles.map((v, i) => (<TableRow key={`v-${i}`}><TableCell>{v.licensePlate}</TableCell><TableCell>{v.make} {v.model} ({v.year})</TableCell><TableCell>{v.ownerName}</TableCell></TableRow>))}</TableBody></Table>
                                      </div>
                                  </TabsContent>
                                  <TabsContent value="services">
                                      <div className="rounded-md border max-h-96 overflow-y-auto">
                                          <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Placa</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader><TableBody>{migrationResult.services.map((s, i) => (<TableRow key={`s-${i}`}><TableCell>{format(parseISO(s.serviceDate), "dd MMM yyyy", { locale: es })}</TableCell><TableCell>{s.vehicleLicensePlate}</TableCell><TableCell>{s.description}</TableCell><TableCell className="text-right">{formatCurrency(s.totalCost)}</TableCell></TableRow>))}</TableBody></Table>
                                      </div>
                                  </TabsContent>
                              </Tabs>
                          </div>
                      )}
                  </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
