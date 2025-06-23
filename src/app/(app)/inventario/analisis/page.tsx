"use client";

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, PackageSearch, AlertTriangle, CheckCircle, ShoppingCart } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { analyzeInventory, type InventoryRecommendation } from '@/ai/flows/inventory-analysis-flow';
import { placeholderInventory, placeholderServiceRecords } from '@/lib/placeholder-data';
import type { InventoryItem, ServiceRecord } from '@/types';

export default function AnalisisInventarioPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InventoryRecommendation[] | null>(null);
  const { toast } = useToast();

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Prepare data for the AI flow
      const inventoryForAI = placeholderInventory.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
      }));

      const servicesForAI = placeholderServiceRecords.map(service => ({
        serviceDate: service.serviceDate,
        suppliesUsed: service.suppliesUsed.map(supply => ({
          supplyId: supply.supplyId,
          quantity: supply.quantity,
        })),
      }));

      const result = await analyzeInventory({
        inventoryItems: inventoryForAI,
        serviceRecords: servicesForAI,
      });

      setAnalysisResult(result.recommendations);
      toast({
        title: "Análisis Completado",
        description: `La IA ha generado ${result.recommendations.length} recomendaciones.`,
        variant: "default"
      });

    } catch (e) {
      console.error(e);
      setError("La IA no pudo completar el análisis. Por favor, inténtelo de nuevo más tarde.");
      toast({
        title: "Error de Análisis",
        description: "Hubo un problema al contactar con la IA.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Análisis de Inventario con IA"
        description="Obtén recomendaciones inteligentes sobre qué y cuándo reordenar."
        actions={
          <Button onClick={handleRunAnalysis} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            {isLoading ? "Analizando..." : "Analizar Inventario"}
          </Button>
        }
      />
      <div className="mt-8">
        {!analysisResult && !isLoading && !error && (
            <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
                <PackageSearch className="h-16 w-16 text-muted-foreground mb-4"/>
                <CardTitle className="text-xl">Listo para analizar</CardTitle>
                <CardDescription className="mt-2 max-w-md mx-auto">
                    Haz clic en el botón "Analizar Inventario" para que la inteligencia artificial revise tu stock actual y el historial de uso para generar recomendaciones de compra.
                </CardDescription>
            </Card>
        )}
        {isLoading && (
            <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4"/>
                <CardTitle className="text-xl">Procesando...</CardTitle>
                <CardDescription className="mt-2 max-w-md mx-auto">
                    La IA está calculando las tasas de consumo y comparando con los niveles de stock. Esto puede tomar un momento.
                </CardDescription>
            </Card>
        )}
        {error && (
            <Card className="flex flex-col items-center justify-center text-center p-12 border-destructive bg-destructive/10 text-destructive-foreground">
                <AlertTriangle className="h-16 w-16 mb-4"/>
                <CardTitle className="text-xl">Ocurrió un Error</CardTitle>
                <CardDescription className="mt-2 text-destructive-foreground/80">{error}</CardDescription>
            </Card>
        )}
        {analysisResult && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {analysisResult.length === 0 && (
                <div className="lg:col-span-3">
                    <Card className="flex flex-col items-center justify-center text-center p-12 bg-green-50/50 border-green-200">
                        <CheckCircle className="h-16 w-16 text-green-600 mb-4"/>
                        <CardTitle className="text-xl text-green-800">¡Todo en orden!</CardTitle>
                        <CardDescription className="mt-2 text-green-700">
                            La IA ha revisado tu inventario y no ha encontrado ningún artículo que requiera una acción de compra inmediata. ¡Buen trabajo!
                        </CardDescription>
                    </Card>
                </div>
            )}
            {analysisResult.map((rec) => (
              <Card key={rec.itemId} className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                     <AlertTriangle className="h-6 w-6 text-orange-500" />
                    {rec.itemName}
                  </CardTitle>
                  <CardDescription>{rec.recommendation}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                   <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                        <span className="font-medium text-sm">Cantidad a reordenar:</span>
                        <span className="font-bold text-lg text-primary flex items-center gap-2">
                           <ShoppingCart className="h-5 w-5"/>
                           {rec.suggestedReorderQuantity}
                        </span>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
