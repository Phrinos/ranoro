
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, PackageCheck, ShoppingCart, BrainCircuit } from 'lucide-react';
import type { InventoryItem, ServiceRecord } from '@/types';
import { analyzeInventory, type InventoryRecommendation } from '@/ai/flows/inventory-analysis-flow';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnalisisIaContentProps {
  inventoryItems: InventoryItem[];
  serviceRecords: ServiceRecord[];
}

export function AnalisisIaContent({ inventoryItems, serviceRecords }: AnalisisIaContentProps) {
  const { toast } = useToast();
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InventoryRecommendation[] | null>(null);

  const handleRunAnalysis = useCallback(async () => {
    setIsAnalysisLoading(true); 
    setAnalysisError(null); 
    setAnalysisResult(null);
    try {
      const inventoryForAI = inventoryItems.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, lowStockThreshold: item.lowStockThreshold }));
      
      const result = await analyzeInventory({ inventoryItems: inventoryForAI });
      setAnalysisResult(result.recommendations);
      toast({ title: "Análisis Completado", description: `La IA ha generado ${result.recommendations.length} recomendaciones.` });
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Ocurrió un error desconocido.";
      setAnalysisError(errorMessage);
      toast({ title: "Error de Análisis", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [inventoryItems, toast]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Análisis de Inventario con IA</h2>
        <p className="text-muted-foreground">Obtén recomendaciones inteligentes sobre qué y cuándo reordenar.</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleRunAnalysis} disabled={isAnalysisLoading}>
          {isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
          {isAnalysisLoading ? "Analizando..." : "Analizar Inventario"}
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {!analysisResult && !isAnalysisLoading && !analysisError && (<Card className="flex flex-col items-center justify-center text-center p-12 border-dashed"><PackageCheck className="h-16 w-16 text-muted-foreground mb-4"/><CardTitle className="text-xl">Listo para analizar</CardTitle><CardDescription className="mt-2 max-w-md mx-auto">Haz clic en &quot;Analizar Inventario&quot; para que la IA revise tu stock y uso para generar recomendaciones.</CardDescription></Card>)}
          {isAnalysisLoading && (<Card className="flex flex-col items-center justify-center text-center p-12 border-dashed"><Loader2 className="h-16 w-16 text-primary animate-spin mb-4"/><CardTitle className="text-xl">Procesando...</CardTitle><CardDescription className="mt-2 max-w-md mx-auto">La IA está calculando las tasas de consumo. Esto puede tomar un momento.</CardDescription></Card>)}
          {analysisError && (<Card className="flex flex-col items-center justify-center text-center p-12 border-destructive bg-destructive/10 text-destructive-foreground"><AlertTriangle className="h-12 w-12 mb-4"/><CardTitle className="text-xl">Ocurrió un Error</CardTitle><CardDescription className="mt-2 text-destructive-foreground/80">{analysisError}</CardDescription></Card>)}
          {analysisResult && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analysisResult.length === 0 ? (
                <div className="lg:col-span-3">
                  <Card className="flex flex-col items-center justify-center text-center p-12 bg-green-50/50 border-green-200">
                    <CheckCircle className="h-16 w-16 text-green-600 mb-4"/>
                    <CardTitle className="text-xl text-green-800">¡Todo en orden!</CardTitle>
                    <CardDescription className="mt-2 text-green-700">La IA ha revisado tu inventario y no se requieren compras inmediatas.</CardDescription>
                  </Card>
                </div>
              ) : (
                analysisResult.map((rec) => (
                  <Card key={rec.itemId} className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-orange-500" />{rec.itemName}</CardTitle>
                      <CardDescription>{rec.recommendation}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                      <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                        <span className="font-medium text-sm">Sugerencia de compra:</span>
                        <span className="font-bold text-lg text-primary flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5"/>{rec.suggestedReorderQuantity}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
