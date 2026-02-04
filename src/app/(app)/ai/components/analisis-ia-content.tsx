"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { 
    Loader2, CheckCircle, AlertTriangle, PackageCheck, 
    ShoppingCart, BrainCircuit, TrendingDown, RefreshCcw 
} from 'lucide-react';
import type { InventoryItem, ServiceRecord } from '@/types';
import { analyzeInventory, type InventoryRecommendation } from '@/ai/flows/inventory-analysis-flow';
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from '@/lib/services';
import { Badge } from "@/components/ui/badge";

interface AnalisisIaContentProps {
  inventoryItems: InventoryItem[];
  serviceRecords: ServiceRecord[];
}

export function AnalisisIaContent({ inventoryItems: initialItems }: AnalisisIaContentProps) {
  const { toast } = useToast();
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InventoryRecommendation[] | null>(null);
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(initialItems);

  useEffect(() => {
    const unsub = inventoryService.onItemsUpdate(setLocalInventory);
    return () => unsub();
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (localInventory.length === 0) {
        toast({ title: "Sin datos", description: "No hay artículos en el inventario para analizar.", variant: "destructive" });
        return;
    }
    setIsAnalysisLoading(true); 
    setAnalysisError(null); 
    try {
      const inventoryForAI = localInventory.map(item => ({ 
        id: item.id, 
        name: item.name, 
        sku: item.sku,
        quantity: item.quantity || 0, 
        lowStockThreshold: item.lowStockThreshold || 0 
      }));
      
      const result = await analyzeInventory({ inventoryItems: inventoryForAI });
      setAnalysisResult(result.recommendations);
      toast({ title: "Análisis Completado", description: `La IA ha generado ${result.recommendations.length} recomendaciones críticas.` });
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Ocurrió un error inesperado al consultar a la IA.";
      setAnalysisError(errorMessage);
      toast({ title: "Error de Análisis", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [localInventory, toast]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 via-background to-transparent border-primary/10 shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <RefreshCcw className={cn("h-6 w-6 text-primary", isAnalysisLoading && "animate-spin")} />
                Análisis Predictivo de Stock
            </CardTitle>
            <CardDescription className="text-base">
                La IA analiza el historial de consumo para predecir cuándo te quedarás sin stock y cuánto comprar.
            </CardDescription>
          </div>
          <Button onClick={handleRunAnalysis} disabled={isAnalysisLoading} size="lg" className="rounded-xl shadow-md group">
            {isAnalysisLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BrainCircuit className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />}
            {isAnalysisLoading ? "Analizando Patrones..." : "Ejecutar Análisis"}
          </Button>
        </CardHeader>
      </Card>

      {!analysisResult && !isAnalysisLoading && !analysisError && (
        <div className="flex flex-col items-center justify-center text-center p-20 border-2 border-dashed rounded-3xl bg-muted/20">
            <PackageCheck className="h-20 w-20 text-muted-foreground/30 mb-6"/>
            <h3 className="text-xl font-bold text-muted-foreground">Listo para Analizar</h3>
            <p className="mt-2 max-w-md text-muted-foreground/70">Haz clic en el botón superior para que la IA revise tus más de {localInventory.length} artículos en stock.</p>
        </div>
      )}

      {isAnalysisLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
                <Card key={i} className="animate-pulse border-none shadow-md rounded-2xl h-48 bg-muted/50" />
            ))}
        </div>
      )}

      {analysisError && (
        <Card className="flex flex-col items-center justify-center text-center p-12 border-destructive bg-destructive/5 rounded-3xl text-destructive">
            <AlertTriangle className="h-16 w-16 mb-4 animate-bounce"/>
            <CardTitle className="text-2xl">Error de Conexión</CardTitle>
            <CardDescription className="mt-2 text-destructive/80 text-base">{analysisError}</CardDescription>
            <Button variant="outline" className="mt-6 border-destructive hover:bg-destructive/10" onClick={handleRunAnalysis}>Reintentar</Button>
        </Card>
      )}

      {analysisResult && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {analysisResult.length === 0 ? (
            <div className="lg:col-span-3">
              <Card className="flex flex-col items-center justify-center text-center p-20 bg-green-50/50 border-green-200 rounded-3xl shadow-sm">
                <CheckCircle className="h-20 w-20 text-green-600 mb-6"/>
                <CardTitle className="text-2xl text-green-800 font-bold">¡Inventario Saludable!</CardTitle>
                <CardDescription className="mt-2 text-green-700 text-lg">La IA no detectó riesgos de desabasto ni artículos críticos en este momento.</CardDescription>
              </Card>
            </div>
          ) : (
            analysisResult.map((rec) => (
              <Card key={rec.itemId} className="shadow-lg border-primary/5 hover:border-primary/20 transition-all rounded-2xl group flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="destructive" className="bg-orange-500 uppercase text-[10px] rounded-lg">Prioridad Alta</Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">{rec.itemSku || 'SIN SKU'}</span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{rec.itemName}</CardTitle>
                  <CardDescription className="font-semibold text-orange-600">{rec.recommendation}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec.reasoning}</p>
                  <div className="mt-auto bg-muted/50 p-4 rounded-2xl flex justify-between items-center border border-muted">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Sugerencia Compra</p>
                        <p className="font-bold text-2xl text-primary">{rec.suggestedReorderQuantity} <span className="text-sm font-medium text-muted-foreground">unid.</span></p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <ShoppingCart className="h-6 w-6"/>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
