// src/app/(app)/servicios/components/ServiceFormBody.tsx
'use client';

import React from 'react';
import { useFormContext, type UseFormReturn } from 'react-hook-form';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { SafetyChecklist } from './SafetyChecklist';
import type { Vehicle, Technician, InventoryItem, ServiceTypeRecord, ServiceRecord } from '@/types';
import type { ServiceFormValues } from '@/schemas/service-form';

interface ServiceFormBodyProps {
    form: UseFormReturn<ServiceFormValues>;
    isReadOnly?: boolean;
    localVehicles: Vehicle[];
    serviceHistory: ServiceRecord[];
    openNewVehicleDialog: () => void;
    technicians: Technician[];
    inventoryItems: InventoryItem[];
    serviceTypes: ServiceTypeRecord[];
    mode: 'service' | 'quote';
    totalCost: number;
    totalSuppliesWorkshopCost: number;
    serviceProfit: number;
    handleGenerateQuote: () => void;
    isGeneratingQuote: boolean;
}

export function ServiceFormBody({
    form,
    isReadOnly,
    localVehicles,
    serviceHistory,
    openNewVehicleDialog,
    technicians,
    inventoryItems,
    serviceTypes,
    mode,
    totalCost,
    totalSuppliesWorkshopCost,
    serviceProfit,
    handleGenerateQuote,
    isGeneratingQuote,
}: ServiceFormBodyProps) {
    const { control, watch } = form;
    const showAdv = watch('status') && ['En Taller', 'Entregado', 'Cancelado'].includes(watch('status')!);

    // NOTE: This body component now only cares about laying out the tabs' content.
    // The tabs themselves are in the header.

    return (
        <>
            <TabsContent value="servicio" className="mt-6">
                <Card className="shadow-none border-none p-0">
                    <CardContent className="p-0 space-y-6">
                        <VehicleSelectionCard
                            isReadOnly={isReadOnly}
                            localVehicles={localVehicles}
                            serviceHistory={serviceHistory}
                            onVehicleSelected={() => {}}
                            onOpenNewVehicleDialog={openNewVehicleDialog}
                        />
                        <ServiceDetailsCard
                            isReadOnly={isReadOnly}
                            technicians={technicians}
                            inventoryItems={inventoryItems}
                            serviceTypes={serviceTypes}
                            mode={mode}
                            totalCost={totalCost}
                            totalSuppliesWorkshopCost={totalSuppliesWorkshopCost}
                            serviceProfit={serviceProfit}
                            onGenerateQuoteWithAI={handleGenerateQuote}
                            isGeneratingQuote={isGeneratingQuote}
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            {showAdv && (
                <>
                    <TabsContent value="recepcion" className="mt-6">
                        {/* Placeholder, logic will be moved here */}
                        <p>Contenido de Recepción y Entrega...</p>
                    </TabsContent>
                    <TabsContent value="seguridad" className="mt-6">
                        {/* Placeholder, logic will be moved here */}
                        <p>Contenido del Checklist de Seguridad...</p>
                    </TabsContent>
                </>
            )}
        </>
    );
}
