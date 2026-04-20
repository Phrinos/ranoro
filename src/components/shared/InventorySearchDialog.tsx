"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Button } from "@/components/ui/button";
import { PackagePlus, Tags, Package, Car, Search as SearchIcon, Loader2 } from "lucide-react";
import type { InventoryItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Badge } from "@/components/ui/badge";

interface InventorySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems?: InventoryItem[];                              // opcional
  onItemSelected: (item: InventoryItem, quantity: number) => void;
  onNewItemRequest?: (searchTerm: string) => void;
  includeServices?: boolean;                                     // por defecto true
}

const normalize = (s?: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function InventorySearchDialog({
  open,
  onOpenChange,
  inventoryItems,
  onItemSelected,
  onNewItemRequest,
  includeServices = true,
}: InventorySearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [autoLoaded, setAutoLoaded] = useState<InventoryItem[] | null>(null);
  // Empezar en true si el diálogo abre con datos aún no cargados
  const [isLoading, setIsLoading] = useState(open);

  // Siempre carga desde Firestore cuando el diálogo está abierto,
  // independientemente de si recibimos inventoryItems como prop.
  // Esto garantiza que los productos recién agregados siempre aparezcan.
  useEffect(() => {
    if (!open) {
      setAutoLoaded(null);
      setIsLoading(false);
      return;
    }

    // Mostrar spinner inmediatamente al abrir
    setIsLoading(true);
    const base = collection(db, "inventory");
    const q = includeServices ? query(base) : query(base, where("isService", "==", false));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAutoLoaded(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setIsLoading(false);
      },
      (err) => {
          console.error("Error loading items from firestore:", err);
          setIsLoading(false);
      }
    );
    return () => unsub();
  }, [open, includeServices]);

  // La fuente siempre es el snapshot reactivo de Firestore cuando está disponible.
  // inventoryItems prop solo se usa si aún no hemos recibido datos de Firestore.
  const source = useMemo(() => autoLoaded ?? inventoryItems ?? [], [autoLoaded, inventoryItems]);

  const score = (it: any) =>
    (it.timesSold || it.salesCount || 0) * 3 +
    (it.timesUsed || it.serviceUsageCount || 0) * 3 +
    (it.lastSoldAt ? 2 : 0) +
    ((it.quantity ?? 0) > 0 ? 1 : 0);

  const frequentItems = useMemo(
    () => [...source].sort((a, b) => score(b) - score(a)).slice(0, 30),
    [source]
  );

  const filteredItems = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return []; // Mínimo 3 caracteres
    
    const q = normalize(trimmed);
    if (!q) return frequentItems;

    const tokens = q.split(/\s+/).filter(Boolean);
    return source
      .filter((item) => {
        const haystack = normalize(
          [item.name, item.sku, (item as any).brand, item.category, (item as any).keywords]
            .filter(Boolean)
            .join(" ")
        );
        return tokens.every((t) => haystack.includes(t));
      })
      .sort((a, b) => score(b) - score(a))
      .slice(0, 100);
  }, [source, searchTerm, frequentItems]);

  const handleSelect = (item: InventoryItem) => {
    onItemSelected(item, 1);
    handleOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchTerm("");
    }
    onOpenChange(isOpen);
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b bg-white">
          <DialogTitle>Buscar en Inventario</DialogTitle>
          <DialogDescription>Busca por nombre, categoría o SKU. Mínimo 3 caracteres.</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6">
          <Command
            shouldFilter={false}
            className={cn(
              "rounded-lg border bg-white shadow-xs overflow-hidden",
              "**:[[cmdk-input-wrapper]]:px-3 **:[[cmdk-input-wrapper]]:h-12",
              "**:[[cmdk-input]]:text-sm **:[[cmdk-item]]:px-3 **:[[cmdk-item]]:py-3"
            )}
          >
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                placeholder="Escribe al menos 3 caracteres (nombre, SKU, categoría...)"
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Command.List className="max-h-[52vh] overflow-y-auto">
              {isLoading || autoLoaded === null ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-medium">Cargando inventario...</p>
                </div>
              ) : searchTerm.trim().length > 0 && searchTerm.trim().length < 3 ? (
                <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <SearchIcon className="h-8 w-8 opacity-20" />
                  <p className="text-sm font-medium">Ingresa al menos 3 caracteres para buscar...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <CommandEmpty>
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">No se encontraron artículos que coincidan.</p>
                    {!!onNewItemRequest && (
                      <Button variant="link" onClick={() => onNewItemRequest(searchTerm)} className="mt-2 font-bold text-primary">
                        <PackagePlus className="mr-2 h-4 w-4" />
                        ¿Registrar como Nuevo Artículo?
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {!searchTerm.trim() && (
                    <li className="px-3 py-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-muted/30">
                      Sugerencias frecuentes
                    </li>
                  )}

                  {filteredItems.map((item) => {
                    const valueForCmdk = [
                      item.name,
                      item.sku,
                      (item as any).brand,
                      item.category,
                      (item as any).keywords,
                    ].filter(Boolean).join(" ");

                    const isLowStock = !item.isService && item.quantity <= (item.lowStockThreshold || 0);

                    return (
                      <CommandItem
                        key={item.id}
                        value={valueForCmdk}
                        onSelect={() => handleSelect(item)}
                        className="flex flex-col items-start gap-1.5 cursor-pointer border-b last:border-0 hover:bg-muted/50 data-disabled:opacity-100 data-disabled:pointer-events-auto p-3"
                      >
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant="secondary" className="shrink-0 text-[9px] font-bold uppercase tracking-wider h-5">
                              {item.category || 'General'}
                            </Badge>
                            <span className="font-bold text-base truncate">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-primary text-lg">
                              {formatCurrency(item.sellingPrice ?? 0)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Tags className="h-3.5 w-3.5 opacity-50" />
                            <span>SKU: <span className="font-medium text-foreground">{item.sku || '—'}</span></span>
                          </div>
                          
                          {!item.isService && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 opacity-50" />
                              <span>Stock: <span className={cn("font-bold", isLowStock ? "text-destructive" : "text-foreground")}>
                                {item.quantity}
                              </span></span>
                            </div>
                          )}

                          {(item as any).brand && (
                            <div className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 opacity-50" />
                              <span>Marca: <span className="font-medium text-foreground">{(item as any).brand}</span></span>
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </Command.List>
          </Command>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
