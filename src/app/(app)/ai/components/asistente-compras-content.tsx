"use client";

import React, { useState, useEffect } from 'react';
import type { ServiceRecord, InventoryItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, AlertTriangle, Wand2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPurchaseRecommendations, type PurchaseRecommendationOutput } from '@/ai/flows/purchase-recommendation-flow';
import { serviceService, inventoryService } from '@/lib/services';
import { isToday, isTomorrow, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { parseDate } from '@/lib/forms';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { PurchaseOrderContent } from './purchase-order-content';
import { cn } from "@/lib/utils";

const handleAiError = (error: any, toast: any, context: string): string => {
    console.error(`AI Error in ${context}:`, error);
    let message = `La IA no pudo completar la acción de ${context}.`;
    if (error instanceof Error && error.message.includes('503')) {
        message = 'El modelo de IA está sobrecargado. Por favor, inténtelo de nuevo más tarde.';
    }
    toast({ title: 'Error de IA', description: message, variant: 'destructive' });
    return message;
};


export default function AsistenteComprasContent() {
    const { toast } = useToast();
    const [purchaseRecommendations, setPurchaseRecommendations] = useState<PurchaseRecommendationOutput['recommendations'] | null>(null);
    const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [isPurchaseOrderDialogOpen, setIsPurchaseOrderDialogOpen] = useState(false);
    
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        setIsLoadingData(true);
        const unsubs = [
            serviceService.onServicesUpdate(setAllServices),
            inventoryService.onItemsUpdate((items) => {
                setAllInventory(items);
                setIsLoadingData(false);
            }),
        ];
        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const handleGeneratePurchaseOrder = async (range: 'today' | 'tomorrow' = 'today') => {
        setIsPurchaseLoading(true);
        setPurchaseError(null);
        setPurchaseRecommendations(null);

        try {
            const targetDate = range === 'today' ? new Date() : addDays(new Date(), 1);
            
            const servicesForAnalysis = allServices.filter(s => {
                const serviceDay = parseDate(s.serviceDate || new Date().toISOString());
                const status = (s.status || '').toLowerCase();
                const isTargetDay = range === 'today' ? isToday(serviceDay!) : isTomorrow(serviceDay!);
                return serviceDay && isTargetDay && status !== 'entregado' && status !== 'cancelado';
            });

            if (servicesForAnalysis.length === 0) {
                toast({ 
                    title: 'Sin trabajos agendados', 
                    description: `No hay servicios activos para ${range === 'today' ? 'hoy' : 'mañana'} que requieran análisis.`, 
                    variant: 'default' 
                });
                setIsPurchaseLoading(false);
                return;
            }
        
            const input = {
                scheduledServices: servicesForAnalysis.map(s => ({ id: s.id, description: s.description || '' })),
                inventoryItems: allInventory.map(i => ({ id: i.id, name: i.name, quantity: i.quantity || 0, supplier: i.supplier ?? '' })),
                serviceHistory: allServices.map(s => ({
                    description: s.description || '',
                    suppliesUsed: (s.serviceItems || []).flatMap(item => item.suppliesUsed || []).map(sup => ({ 
                        supplyName: sup.supplyName || allInventory.find(i => i.id === sup.supplyId)?.name || 'Unknown' 
                    }))
                }))
            };

            const result = await getPurchaseRecommendations(input as any);
            setPurchaseRecommendations(result.recommendations);
            toast({ title: 'Orden Generada', description: result.reasoning });
            if (result.recommendations.length > 0) {
                setIsPurchaseOrderDialogOpen(true);
            } else {
                toast({ title: "Stock Suficiente", description: "La IA determinó que tienes todo lo necesario en stock." });
            }
        } catch (e) {
            setPurchaseError(handleAiError(e, toast, 'recomendación de compra'));
        } finally {
            setIsPurchaseLoading(false);
        }
    };

    if (isLoadingData) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-xl border-primary/10 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 via-transparent to-transparent pb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                    <ShoppingCart className="h-6 w-6 text-primary" />
                                </div>
                                Asistente de Compras IA
                            </CardTitle>
                            <CardDescription className="text-base max-w-xl">
                                Analiza los servicios de tu agenda y genera automáticamente una lista de compras basada en lo que te hace falta en stock.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <Button 
                                onClick={() => handleGeneratePurchaseOrder('today')} 
                                disabled={isPurchaseLoading}
                                size="lg"
                                className="rounded-xl h-12 shadow-lg gap-2"
                            >
                                {isPurchaseLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                                Analizar para HOY
                            </Button>
                            <Button 
                                onClick={() => handleGeneratePurchaseOrder('tomorrow')} 
                                disabled={isPurchaseLoading}
                                size="lg"
                                variant="outline"
                                className="rounded-xl h-12 gap-2 bg-white"
                            >
                                <Sparkles className="h-5 w-5 text-primary" />
                                Analizar para MAÑANA
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {purchaseError && (
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-3 p-4 bg-destructive/5 text-destructive rounded-xl border border-destructive/20">
                            <AlertTriangle className="h-6 w-6" />
                            <span className="font-medium">{purchaseError}</span>
                        </div>
                    </CardContent>
                )}
                
                <CardContent className="border-t bg-muted/20 p-8 text-center text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="p-4 bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-sm">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm italic">
                            "La IA revisará tus servicios agendados y cruzará la información con tu inventario actual para decirte exactamente qué comprar."
                        </p>
                    </div>
                </CardContent>
            </Card>

            {purchaseRecommendations && (
                <UnifiedPreviewDialog
                    open={isPurchaseOrderDialogOpen}
                    onOpenChange={setIsPurchaseOrderDialogOpen}
                    title="Orden de Compra Sugerida por IA"
                >
                    <PurchaseOrderContent
                        recommendations={purchaseRecommendations}
                    />
                </UnifiedPreviewDialog>
            )}
        </div>
    );
}
