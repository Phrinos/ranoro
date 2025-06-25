
"use client";

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Search, Trash2, Edit, Car, Wrench, Clock, DollarSign } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { persistToFirestore, placeholderVehiclePriceLists } from '@/lib/placeholder-data';
import type { VehiclePriceList } from '@/types';
import { PriceListDialog } from './components/price-list-dialog';
import type { PriceListFormValues } from './components/price-list-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function PriceListPage() {
  const [priceLists, setPriceLists] = useState<VehiclePriceList[]>(placeholderVehiclePriceLists);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehiclePriceList | null>(null);
  const { toast } = useToast();

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return priceLists;
    const lowerSearch = searchTerm.toLowerCase();
    return priceLists.filter(record => 
      record.make.toLowerCase().includes(lowerSearch) ||
      record.model.toLowerCase().includes(lowerSearch) ||
      record.years.some(year => String(year).includes(lowerSearch))
    );
  }, [priceLists, searchTerm]);

  const handleOpenDialog = useCallback((record: VehiclePriceList | null = null) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  }, []);

  const handleSaveRecord = useCallback(async (formData: PriceListFormValues) => {
    let updatedList: VehiclePriceList[];

    if (editingRecord) {
      updatedList = priceLists.map(rec => 
        rec.id === editingRecord.id ? { ...editingRecord, ...formData } : rec
      );
      toast({ title: "Lista de Precios Actualizada", description: `La lista para ${formData.make} ${formData.model} ha sido actualizada.` });
    } else {
      const newRecord: VehiclePriceList = {
        id: `VPL_${Date.now().toString(36)}`,
        ...formData,
      };
      updatedList = [...priceLists, newRecord];
      toast({ title: "Lista de Precios Creada", description: `Se ha añadido la lista para ${formData.make} ${formData.model}.` });
    }

    setPriceLists(updatedList);
    placeholderVehiclePriceLists.splice(0, placeholderVehiclePriceLists.length, ...updatedList);
    await persistToFirestore(['vehiclePriceLists']);
    setIsDialogOpen(false);
  }, [editingRecord, priceLists, toast]);
  
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    const recordToDelete = priceLists.find(r => r.id === recordId);
    if (!recordToDelete) return;

    const updatedList = priceLists.filter(rec => rec.id !== recordId);
    setPriceLists(updatedList);
    placeholderVehiclePriceLists.splice(0, placeholderVehiclePriceLists.length, ...updatedList);
    await persistToFirestore(['vehiclePriceLists']);

    toast({
      title: "Registro Eliminado",
      description: `La lista de precios para "${recordToDelete.make} ${recordToDelete.model}" ha sido eliminada.`,
      variant: 'destructive',
    });
  }, [priceLists, toast]);
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const formatYearRange = (years: number[]): string => {
    if (!years || years.length === 0) return 'N/A';
    const sortedYears = [...years].sort((a, b) => a - b);
    return sortedYears.join(', ');
  };

  return (
    <>
      <PageHeader
        title="Lista de Precios por Vehículo"
        description="Base de datos de servicios y precios por vehículo para agilizar cotizaciones y análisis."
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Lista por Vehículo
          </Button>
        }
      />
      <div className="mb-6">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por marca, modelo o año..."
              className="w-full rounded-lg bg-background pl-8 md:w-1/2 lg:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredRecords.length > 0 ? filteredRecords.map(record => (
          <Card key={record.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    {record.make} {record.model}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono">{formatYearRange(record.years)}</Badge>
              </div>
              <CardDescription>
                  {record.services.length} servicio(s) estandarizado(s) para este modelo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 flex-grow">
              <h4 className="font-semibold text-sm mb-2">Servicios Disponibles:</h4>
              <ScrollArea className="h-40 pr-3">
                <div className="space-y-3">
                    {record.services.map((service) => (
                        <div key={service.id} className="text-sm p-2 border rounded-md bg-muted/50">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">{service.serviceName}</span>
                                <span className="font-bold text-primary">{formatCurrency(service.customerPrice)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={service.description}>{service.description}</p>
                        </div>
                    ))}
                </div>
              </ScrollArea>
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
                      <AlertDialogTitle>¿Eliminar esta lista de precios?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente la lista de precios para "{record.make} {record.model}".
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
            {searchTerm ? "No se encontraron listas de precios." : "No hay listas de precios para vehículos."}
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
