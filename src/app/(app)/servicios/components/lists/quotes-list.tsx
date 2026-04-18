// src/app/(app)/servicios/components/lists/quotes-list.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ServiceRecord, Vehicle, User } from "@/types";
import { ServiceListCard } from "../cards/service-list-card";
import { serviceService } from "@/lib/services";
import { useTableManager } from "@/hooks/useTableManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuotesListProps {
  vehicles: Vehicle[];
  personnel: User[];
  currentUser: User | null;
  onView: (service: ServiceRecord) => void;
  onDelete: (id: string) => Promise<void>;
}

export function QuotesList({ vehicles, personnel, currentUser, onView, onDelete }: QuotesListProps) {
  const router = useRouter();
  const [allActive, setAllActive] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    const unsub = serviceService.onActiveServicesUpdate(setAllActive);
    return () => unsub();
  }, []);

  const quotes = useMemo(() => allActive.filter((s) => s.status === "Cotizacion"), [allActive]);

  const { paginatedData, ...tm } = useTableManager<ServiceRecord>({
    initialData: quotes,
    searchKeys: ["id", "vehicleIdentifier", "customerName", "serviceItems.name"],
    dateFilterKey: "serviceDate",
    initialSortOption: "serviceDate_desc",
    itemsPerPage: 10,
  });

  const handleEdit = useCallback(
    (id: string) => router.push(`/servicios/${id}`),
    [router]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, cliente..."
            value={tm.searchTerm}
            onChange={(e) => tm.onSearchTermChange(e.target.value)}
            className="pl-9 pr-8 h-10 bg-background"
          />
          {tm.searchTerm && (
            <button
              onClick={() => tm.onSearchTermChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={tm.sortOption} onValueChange={tm.onSortOptionChange}>
          <SelectTrigger className="h-10 w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="serviceDate_desc">Más Reciente</SelectItem>
            <SelectItem value="serviceDate_asc">Más Antiguo</SelectItem>
            <SelectItem value="totalCost_desc">Monto (Mayor)</SelectItem>
            <SelectItem value="totalCost_asc">Monto (Menor)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paginatedData.length > 0 ? (
        <>
          <div className="space-y-3">
            {paginatedData.map((q) => (
              <ServiceListCard
                key={q.id}
                service={q}
                vehicle={vehicles.find((v) => v.id === q.vehicleId)}
                personnel={personnel}
                currentUser={currentUser}
                onEdit={() => handleEdit(q.id)}
                onView={() => onView(q)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{tm.paginationSummary}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={tm.goToPreviousPage} disabled={!tm.canGoPrevious} className="bg-background">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button size="sm" variant="outline" onClick={tm.goToNextPage} disabled={!tm.canGoNext} className="bg-background">
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          <FileText className="h-12 w-12 mb-3 opacity-20" />
          <h3 className="text-lg font-semibold text-foreground">Sin cotizaciones</h3>
          <p className="text-sm mt-1">Crea una nueva cotización para comenzar.</p>
        </div>
      )}
    </div>
  );
}
