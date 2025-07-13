
// src/hooks/use-service-form-hooks.ts

import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch, type UseFormReturn } from 'react-hook-form';
import type { ServiceFormValues } from '@/schemas/service-form';
import { parseDate } from '@/lib/forms';
import { nanoid } from 'nanoid';
import type { ServiceRecord, QuoteRecord, User, ServiceTypeRecord } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

/**
 * Custom hook to calculate service totals dynamically based on form values.
 * @param form - The react-hook-form instance.
 * @returns An object with totalCost, totalSuppliesWorkshopCost, and serviceProfit.
 */
export function useServiceTotals(form: UseFormReturn<ServiceFormValues>) {
  const watchedItems = useWatch({ control: form.control, name: 'serviceItems' });

  return useMemo(() => {
    const total = (watchedItems ?? []).reduce(
      (s, i) => s + (Number(i.price) || 0),
      0
    );
    const cost = (watchedItems ?? [])
      .flatMap((i) => i.suppliesUsed ?? [])
      .reduce(
        (s, su) => s + (Number(su.unitPrice) || 0) * Number(su.quantity || 0),
        0
      );
    return {
      totalCost: total,
      totalSuppliesWorkshopCost: cost,
      serviceProfit: total - cost,
    };
  }, [watchedItems]);
}

/**
 * Custom hook to watch the service status and trigger a callback on change.
 * @param form - The react-hook-form instance.
 * @param onStatusChange - Callback function to execute when status changes.
 */
export function useServiceStatusWatcher(
  form: UseFormReturn<ServiceFormValues>,
  onStatusChange?: (status?: ServiceFormValues['status']) => void
) {
  const watchedStatus = useWatch({ control: form.control, name: 'status' });

  useEffect(() => {
    onStatusChange?.(watchedStatus);
  }, [watchedStatus, onStatusChange]);
}

interface InitFormOptions {
    initData?: ServiceRecord | Partial<QuoteRecord> | null;
    serviceTypes: ServiceTypeRecord[];
}

/**
 * Custom hook to initialize the service form with default or existing data.
 * @param form - The react-hook-form instance.
 * @param options - Options including initial data and service types.
 */
export function useInitServiceForm(form: UseFormReturn<ServiceFormValues>, { initData, serviceTypes }: InitFormOptions) {
  const { reset } = form;

  useEffect(() => {
    const isEditing = initData && 'id' in initData && initData.id;
    const firstType = serviceTypes[0]?.name ?? 'Servicio General';
    
    let baseData: Partial<ServiceFormValues>;

    if (isEditing) {
      baseData = {
        ...initData,
        // Ensure serviceItems and photoReports are always arrays
        serviceItems: initData.serviceItems?.length ? initData.serviceItems : [],
        photoReports: initData.photoReports?.length ? initData.photoReports : [],
      };
    } else {
      // For a new record, set clear, reliable defaults.
      const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      const currentUser = authUserString ? JSON.parse(authUserString) as User : null;

      baseData = {
        status: 'Cotizacion',
        serviceType: firstType,
        serviceDate: new Date(),
        quoteDate: new Date(),
        serviceItems: [{ id: nanoid(), name: firstType, price: undefined, suppliesUsed: [] }],
        photoReports: [{ id: `rep_recepcion_${Date.now()}`, date: new Date().toISOString(), description: 'Notas de la Recepción', photos: [] }],
        serviceAdvisorId: currentUser?.id,
        serviceAdvisorName: currentUser?.name,
        serviceAdvisorSignatureDataUrl: currentUser?.signatureDataUrl || '',
      };
    }

    // Process dates to ensure they are Date objects
    const finalData = {
      ...baseData,
      serviceDate: baseData.serviceDate ? parseDate(baseData.serviceDate) : undefined,
      quoteDate: baseData.quoteDate ? parseDate(baseData.quoteDate) : undefined,
      receptionDateTime: baseData.receptionDateTime ? parseDate(baseData.receptionDateTime) : undefined,
      deliveryDateTime: baseData.deliveryDateTime ? parseDate(baseData.deliveryDateTime) : undefined,
    };
    
    reset(finalData);
  }, [initData, serviceTypes, reset]);
}
