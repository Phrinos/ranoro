"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, CheckCircle2, Circle, Loader2, AlertTriangle, PlusCircle } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import type { Vehicle, VehicleGroup, InventoryItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SmartQuoterCardProps {
  vehicle: Vehicle;
}

export function SmartQuoterCard({ vehicle }: SmartQuoterCardProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for user selections
  const [selectedAceiteIdx, setSelectedAceiteIdx] = useState<string>('none');
  const [useFiltroAceite, setUseFiltroAceite] = useState<boolean>(true);
  const [useFiltroAire, setUseFiltroAire] = useState<boolean>(false);
  const [selectedBujiaIdx, setSelectedBujiaIdx] = useState<string>('none');
  const [useOtros, setUseOtros] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubGroups = inventoryService.onVehicleGroupsUpdate((g) => {
      setGroups(g);
      setIsLoading(false);
    });
    const unsubInv = inventoryService.onItemsUpdate((items) => {
      setInventory(items);
    });
    return () => {
      unsubGroups();
      unsubInv();
    };
  }, []);

  const applicableGroup = useMemo(() => {
    return groups.find(g => 
      g.members.some(m => m.make === vehicle?.make && m.model === vehicle?.model)
    );
  }, [groups, vehicle]);

  // Set default selections if a group is found
  useEffect(() => {
    if (applicableGroup) {
      if (applicableGroup.items.aceites?.length > 0) {
        setSelectedAceiteIdx("0"); // Select first by default
      }
      if (applicableGroup.items.filtrosAceite?.length > 0) {
        setUseFiltroAceite(true);
      }
    }
  }, [applicableGroup]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Precotizador Inteligente</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  if (!applicableGroup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-muted-foreground"/> Precotizador Inteligente</CardTitle>
          <CardDescription>No hay reglas de precios configuradas para {vehicle.make} {vehicle.model}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>Configura las refacciones compatibles en la Lista de Precios para cotizar automáticamente.</p>
            <Button variant="outline" size="sm" className="mt-4 bg-white" onClick={() => router.push('/listadeprecios?tab=grupos')}>
              Ir a Lista de Precios
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = applicableGroup.items;
  
  // Helpers to calculate prices
  const getItemPrice = (inventoryId: string) => {
    return inventory.find(i => i.id === inventoryId)?.sellingPrice || 0;
  };

  let totalCost = 0;
  
  // Calculate Aceite
  const activeAceite = selectedAceiteIdx !== 'none' && items.aceites[parseInt(selectedAceiteIdx)];
  if (activeAceite) totalCost += getItemPrice(activeAceite.inventoryItemId) * activeAceite.quantity;

  // Calculate Filtros
  const activeFiltroAc = useFiltroAceite && items.filtrosAceite[0];
  if (activeFiltroAc) totalCost += getItemPrice(activeFiltroAc.inventoryItemId) * activeFiltroAc.quantity;

  const activeFiltroAi = useFiltroAire && items.filtrosAire[0];
  if (activeFiltroAi) totalCost += getItemPrice(activeFiltroAi.inventoryItemId) * activeFiltroAi.quantity;

  // Calculate Bujias
  const activeBujia = selectedBujiaIdx !== 'none' && items.bujias[parseInt(selectedBujiaIdx)];
  if (activeBujia) totalCost += getItemPrice(activeBujia.inventoryItemId) * activeBujia.quantity;

  // Calculate Otros
  const activeOtros = useOtros && items.otros[0];
  if (activeOtros) {
      items.otros.forEach(o => {
          totalCost += getItemPrice(o.inventoryItemId) * o.quantity;
      });
  }

  // Determine Service Name based on smart heuristic
  let serviceName = "Servicio Personalizado";
  if (activeAceite && activeFiltroAc && !activeBujia) {
    serviceName = "Cambio de Aceite";
  }
  if (activeAceite && activeFiltroAc && activeFiltroAi && activeBujia) {
    serviceName = "Afinación Integral";
  }

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 pb-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-primary flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Precotizador
            </CardTitle>
            <CardDescription className="mt-1">Paquete sugerido basado en catálogo</CardDescription>
          </div>
          <Badge variant="outline" className="bg-white">{applicableGroup.name}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-5">
        {/* Aceite Selection */}
        {items.aceites.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Tipo de Aceite</label>
            <Select value={selectedAceiteIdx} onValueChange={setSelectedAceiteIdx}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar Aceite..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Aceite</SelectItem>
                {items.aceites.map((a, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {a.name} ({a.quantity} L) - {formatCurrency(getItemPrice(a.inventoryItemId) * a.quantity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bujias Selection */}
        {items.bujias.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Tipo de Bujías</label>
            <Select value={selectedBujiaIdx} onValueChange={setSelectedBujiaIdx}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar Bujías..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Bujías</SelectItem>
                {items.bujias.map((b, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {b.name} (x{b.quantity}) - {formatCurrency(getItemPrice(b.inventoryItemId) * b.quantity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Toggles for Filters and Others */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {items.filtrosAceite.length > 0 && (
            <div 
              className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-colors ${useFiltroAceite ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted/50'}`}
              onClick={() => setUseFiltroAceite(!useFiltroAceite)}
            >
              {useFiltroAceite ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-xs font-bold leading-none">Filtro Aceite</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(getItemPrice(items.filtrosAceite[0].inventoryItemId) * items.filtrosAceite[0].quantity)}</p>
              </div>
            </div>
          )}

          {items.filtrosAire.length > 0 && (
            <div 
              className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-colors ${useFiltroAire ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted/50'}`}
              onClick={() => setUseFiltroAire(!useFiltroAire)}
            >
              {useFiltroAire ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-xs font-bold leading-none">Filtro Aire</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(getItemPrice(items.filtrosAire[0].inventoryItemId) * items.filtrosAire[0].quantity)}</p>
              </div>
            </div>
          )}

          {items.otros.length > 0 && (
            <div 
              className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-colors col-span-2 ${useOtros ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted/50'}`}
              onClick={() => setUseOtros(!useOtros)}
            >
              {useOtros ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-xs font-bold leading-none">Otros Componentes</p>
                <p className="text-[10px] text-muted-foreground mt-1">{items.otros.length} items pre-configurados</p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Summary Block */}
        <div className="mt-6 p-4 rounded-xl bg-primary text-primary-foreground text-center shadow-lg transform transition-all">
          <p className="text-sm font-medium opacity-90 uppercase tracking-widest">{serviceName}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-sm opacity-80 mt-1">Refacciones:</span>
            <span className="text-3xl font-black">{formatCurrency(totalCost)}</span>
          </div>
          <p className="text-[10px] mt-2 opacity-70">Suma total de insumos seleccionados</p>
        </div>
      </CardContent>
    </Card>
  );
}
