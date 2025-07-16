
// src/hooks/use-service-form-hooks.ts

import { useMemo } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import type { ServiceFormValues } from '@/schemas/service-form';

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
