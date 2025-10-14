"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { suggestQuote } from '@/ai/flows/quote-suggestion-flow';
import type { InventoryItem, ServiceRecord, Vehicle, VehiclePriceList } from '@/types';
import { inventoryService, serviceService } from '@/lib/services';
import vehicleDatabase from '@/lib/data/vehicle-database.json';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { useForm, FormProvider, useFieldArray, Controller } from "react-hook-form";


export default function CotizadorIaContent() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{ suppliesProposed: any[], estimatedTotalCost: number, reasoning: string } | null>(null);

  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  
  React.useEffect(() => {
    const unsubs = [
      serviceService.onServicesUpdate(setAllServices),
      inventoryService.onItemsUpdate(setInventory),
      inventoryService.onPriceListsUpdate(setPriceLists),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const makes = useMemo(() => [...new Set(vehicleDatabase.map(v => v.make))].sort(), []);
  
  const models = useMemo(() => {
    if (!selectedMake) return [];
    const makeData = vehicleDatabase.find(m => m.make === selectedMake);
    return makeData ? [...new Set(makeData.models.map(m => m.name))].sort() : [];
  }, [selectedMake]);

  const years = useMemo(() => {
    if (!selectedModel) return [];
    const makeData = vehicleDatabase.find(m => m.make === selectedMake);
    const modelData = makeData?.models.find(m => m.name === selectedModel);
    if (!modelData) return [];
    const yearSet = new Set<number>();
    modelData.generations.forEach(g => {
        for (let y = g.startYear; y <= g.endYear; y++) {
            yearSet.add(y);
        }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [selectedMake, selectedModel]);


  const handleGenerateQuote = async () => {
    if (!selectedMake || !selectedModel || !selectedYear || !serviceDescription) {
      toast({ title: 'Datos incompletos', description: 'Por favor, seleccione todos los campos y describa el servicio.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setQuoteResult(null);

    try {
        const input = {
            vehicleInfo: { make: selectedMake, model: selectedModel, year: Number(selectedYear) },
            serviceDescription,
            serviceHistory: allServices.map(s => ({
                description: s.description || '',
                suppliesUsed: (s.serviceItems || []).flatMap(item => item.suppliesUsed || []).map(sup => ({ supplyName: sup.supplyName, quantity: sup.quantity })),
                totalCost: s.totalCost || 0,
            })),
            inventory: inventory.map(i => ({ id: i.id, name: i.name, sellingPrice: i.sellingPrice })),
        };
      
      const result = await suggestQuote(input);
      setQuoteResult(result);
      toast({ title: "Cotización Sugerida", description: "La IA ha generado una cotización basada en datos históricos." });
    } catch (e: any) {
      toast({ title: 'Error de la IA', description: e.message || "No se pudo generar la cotización.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Generar Cotización con IA</CardTitle>
          <CardDescription>Describe el vehículo y el servicio para obtener una cotización inteligente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select onValueChange={setSelectedMake} value={selectedMake}><SelectTrigger><SelectValue placeholder="Marca"/></SelectTrigger><SelectContent>{makes.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={setSelectedModel} value={selectedModel} disabled={!selectedMake}><SelectTrigger><SelectValue placeholder="Modelo"/></SelectTrigger><SelectContent>{models.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={setSelectedYear} value={selectedYear} disabled={!selectedModel}><SelectTrigger><SelectValue placeholder="Año"/></SelectTrigger><SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
          </div>
          <Textarea
            placeholder="Describe el servicio requerido... Ej: 'Afinación mayor', 'Cambio de balatas delanteras', 'Ruido en suspensión al pasar topes'"
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            rows={4}
          />
          <Button onClick={handleGenerateQuote} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading ? "Generando..." : "Sugerir Cotización"}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Resultado de la Cotización</CardTitle>
            <CardDescription>Esta es la sugerencia generada por la IA.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
            {quoteResult ? (
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-sm font-medium text-green-800">Precio Sugerido al Cliente</p>
                        <p className="text-4xl font-bold text-green-600">{formatCurrency(quoteResult.estimatedTotalCost)}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Insumos Sugeridos:</h4>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2">
                           {quoteResult.suppliesProposed.map(supply => {
                                const invItem = inventory.find(i => i.id === supply.supplyId);
                                return <li key={supply.supplyId}>{supply.quantity}x {invItem?.name || supply.supplyId}</li>;
                           })}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Razonamiento de la IA:</h4>
                        <p className="text-sm text-muted-foreground italic mt-1">"{quoteResult.reasoning}"</p>
                    </div>
                </div>
            ) : (
                !isLoading && <p className="text-center text-muted-foreground pt-12">Esperando cotización...</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}