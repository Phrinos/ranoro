
"use client";

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Search, Trash2, Edit, Car, Wrench, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { persistToFirestore, placeholderPriceList } from '@/lib/placeholder-data';
import type { PriceListRecord } from '@/types';
import { PriceListDialog } from './components/price-list-dialog';
import type { PriceListFormValues } from './components/price-list-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PriceListPage() {
  const [priceList, setPriceList] = useState<PriceListRecord[]>(placeholderPriceList);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PriceListRecord | null>(null);
  const { toast } = useToast();

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return priceList;
    const lowerSearch = searchTerm.toLowerCase();
    return priceList.filter(record => 
      record.serviceName.toLowerCase().includes(lowerSearch) ||
      record.description?.toLowerCase().includes(lowerSearch) ||
      record.applicableVehicles.some(v => 
        v.make.toLowerCase().includes(lowerSearch) || 
        v.model.toLowerCase().includes(lowerSearch) ||
        v.years.some(year => String(year).includes(lowerSearch))
      )
    );
  }, [priceList, searchTerm]);

  const handleOpenDialog = useCallback((record: PriceListRecord | null = null) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  }, []);

  const handleSaveRecord = useCallback(async (formData: PriceListFormValues) => {
    let updatedList: PriceListRecord[];

    if (editingRecord) {
      updatedList = priceList.map(rec => 
        rec.id === editingRecord.id ? { ...editingRecord, ...formData } : rec
      );
      toast({ title: "Registro Actualizado", description: `El servicio "${formData.serviceName}" ha sido actualizado.` });
    } else {
      const newRecord: PriceListRecord = {
        id: `PL_${Date.now().toString(36)}`,
        ...formData,
      };
      updatedList = [...priceList, newRecord];
      toast({ title: "Registro Creado", description: `El servicio "${formData.serviceName}" ha sido añadido a la lista de precios.` });
    }

    setPriceList(updatedList);
    placeholderPriceList.splice(0, placeholderPriceList.length, ...updatedList);
    await persistToFirestore(['priceList']);
    setIsDialogOpen(false);
  }, [editingRecord, priceList, toast]);
  
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    const recordToDelete = priceList.find(r => r.id === recordId);
    if (!recordToDelete) return;

    const updatedList = priceList.filter(rec => rec.id !== recordId);
    setPriceList(updatedList);
    placeholderPriceList.splice(0, placeholderPriceList.length, ...updatedList);
    await persistToFirestore(['priceList']);

    toast({
      title: "Registro Eliminado",
      description: `El servicio "${recordToDelete.serviceName}" ha sido eliminado.`,
      variant: 'destructive',
    });
  }, [priceList, toast]);
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const formatYearRange = (years: number[]): string => {
    if (!years || years.length === 0) return 'N/A';
    const sortedYears = [...years].sort((a, b) => a - b);
    return sortedYears.join(', ');
  };

  return (
    <>
      <PageHeader
        title="Lista de Precios"
        description="Base de datos de servicios y precios por vehículo para agilizar cotizaciones y análisis."
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Registro
          </Button>
        }
      />
      <div className="mb-6">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por servicio, marca, modelo o año..."
              className="w-full rounded-lg bg-background pl-8 md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecords.length > 0 ? filteredRecords.map(record => (
          <Card key={record.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{record.serviceName}</CardTitle>
                  <Badge variant="secondary" className="text-lg font-bold">{formatCurrency(record.customerPrice)}</Badge>
              </div>
              <CardDescription className="line-clamp-2">{record.description || 'Sin descripción.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Wrench className="h-4 w-4"/> Insumos Requeridos</h4>
                 <ScrollArea className="h-24 pr-3">
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {record.supplies.map((supply, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{supply.quantity}x {supply.name}</span>
                          <span>(Costo: {formatCurrency(supply.cost)})</span>
                        </li>
                      ))}
                    </ul>
                 </ScrollArea>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Car className="h-4 w-4"/> Vehículos Aplicables</h4>
                <ScrollArea className="h-20 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {record.applicableVehicles.map((v, i) => (
                        <Badge key={i} variant="outline">{v.make} {v.model} ({formatYearRange(v.years)})</Badge>
                      ))}
                    </div>
                </ScrollArea>
              </div>
              {record.estimatedTimeHours && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground"/>
                  <span className="font-semibold">Tiempo Estimado:</span>
                  <span>{record.estimatedTimeHours} horas</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3 mt-auto">
              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(record)}>
                <Edit className="h-4 w-4"/>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el registro de "{record.serviceName}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteRecord(record.id)} className="bg-destructive hover:bg-destructive/90">
                        Sí, Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchTerm ? "No se encontraron registros." : "No hay registros en la lista de precios."}
          </div>
        )}
      </div>

      <PriceListDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveRecord}
        record={editingRecord}
      />
    </>
  )
}
