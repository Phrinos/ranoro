"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { ServiceRecord, InventoryItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPurchaseRecommendations, type PurchaseRecommendationOutput } from '@/ai/flows/purchase-recommendation-flow';
import { serviceService, inventoryService } from '@/lib/services';
import { isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { parseDate } from '@/lib/forms';
import { useTableManager } from '@/hooks/useTableManager';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { PurchaseOrderContent } from './purchase-order-content';
import ReactDOMServer from 'react-dom/server';

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

    const handleGeneratePurchaseOrder = async () => {
        setIsPurchaseLoading(true);
        setPurchaseError(null);
        setPurchaseRecommendations(null);

        try {
            const servicesForToday = allServices.filter(s => {
                const serviceDay = parseDate(s.serviceDate);
                return serviceDay && isToday(serviceDay) && s.status !== 'Entregado' && s.status !== 'Cancelado';
            });

            if (servicesForToday.length === 0) {
                toast({ title: 'No hay servicios', description: 'No hay servicios agendados para hoy que requieran compras.', variant: 'default' });
                setIsPurchaseLoading(false);
                return;
            }
        
            const input = {
                scheduledServices: servicesForToday.map(s => ({ id: s.id, description: s.description || '' })),
                inventoryItems: allInventory.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, supplier: i.supplier })),
                serviceHistory: allServices.map(s => ({
                    description: s.description || '',
                    suppliesUsed: (s.serviceItems || []).flatMap(item => item.suppliesUsed || []).map(sup => ({ supplyName: sup.supplyName || allInventory.find(i => i.id === sup.supplyId)?.name || 'Unknown' }))
                }))
            };

            const result = await getPurchaseRecommendations(input);
            setPurchaseRecommendations(result.recommendations);
            toast({ title: 'Orden de Compra Generada', description: result.reasoning, duration: 6000 });
            if (result.recommendations.length > 0) {
                setIsPurchaseOrderDialogOpen(true);
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
        <>
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">Asistente de Compras IA</CardTitle>
                        <CardDescription>Genera una orden de compra consolidada para los servicios de hoy.</CardDescription>
                    </div>
                    <Button onClick={handleGeneratePurchaseOrder} disabled={isPurchaseLoading}>
                        {isPurchaseLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                        {isPurchaseLoading ? 'Analizando...' : 'Generar Orden'}
                    </Button>
                </CardHeader>
                {purchaseError && (
                    <CardContent>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm">{purchaseError}</span>
                    </div>
                    </CardContent>
                )}
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
        </>
    );
}
