// src/app/(app)/servicios/components/ServiceFormBody.tsx
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';
import { VehicleSelectionCard } from './VehicleSelectionCard';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { ReceptionAndDelivery } from './ReceptionAndDelivery';
import { SafetyChecklist } from './SafetyChecklist';
import type { Vehicle, Technician, InventoryItem, ServiceTypeRecord, ServiceRecord } from '@/types';
import { serviceFormSchema, type ServiceFormValues } from '@/schemas/service-form'

interface ServiceFormBodyProps {
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
    const { control, watch } = useFormContext<ServiceFormValues>();
    const status = watch('status');
    const showAdvancedTabs = status && ['En Taller', 'Entregado', 'Cancelado'].includes(status);

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

            {showAdvancedTabs && (
                <>
                    <TabsContent value="recepcion" className="mt-6">
                        <ReceptionAndDelivery 
                            control={control}
                            isReadOnly={isReadOnly}
                            isEnhancingText={null} // Placeholder, logic will be moved to the main form
                            handleEnhanceText={() => {}} // Placeholder
                        />
                    </TabsContent>
                    <TabsContent value="seguridad" className="mt-6">
                        <SafetyChecklist 
                            control={control}
                            isReadOnly={isReadOnly}
                            onSignatureClick={() => {}} // Placeholder
                            isEnhancingText={null} // Placeholder
                            handleEnhanceText={() => {}} // Placeholder
                            serviceId={watch('id') || 'new'}
                            onPhotoUploaded={() => {}} // Placeholder
                            onViewImage={() => {}} // Placeholder
                        />
                    </TabsContent>
                </>
            )}
        </>
    );
}
