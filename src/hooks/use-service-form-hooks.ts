
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
    const firstType = serviceTypes.length > 0 ? serviceTypes[0].name : 'Servicio General';
    
    let defaultValues: Partial<ServiceFormValues>;

    if (isEditing) {
      defaultValues = {
        ...initData,
        serviceDate: initData.serviceDate ? parseDate(initData.serviceDate) : undefined,
        quoteDate: initData.quoteDate ? parseDate(initData.quoteDate) : undefined,
        receptionDateTime: initData.receptionDateTime ? parseDate(initData.receptionDateTime) : undefined,
        deliveryDateTime: initData.deliveryDateTime ? parseDate(initData.deliveryDateTime) : undefined,
        // Ensure status and serviceType are not undefined if they exist in initData
        status: initData.status || 'Cotizacion',
        serviceType: initData.serviceType || firstType,
      };
    } else {
      const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      const currentUser = authUserString ? JSON.parse(authUserString) as User : null;

      defaultValues = {
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
    
    reset(defaultValues);
  }, [initData, serviceTypes, reset]);
}
