// src/app/(app)/listadeprecios/hooks/use-pricing-data.ts
"use client";

import { useState, useEffect } from "react";
import { inventoryService } from "@/lib/services";
import type { PricingGroup } from "@/types";

export function usePricingData() {
  const [groups, setGroups] = useState<PricingGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = inventoryService.onPricingGroupsUpdate((data) => {
      setGroups(data as PricingGroup[]);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  return { groups, isLoading };
}
