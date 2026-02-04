// src/app/(app)/listadeprecios/page.tsx
"use client";

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { withSuspense } from "@/lib/withSuspense";
import { Loader2, PlusCircle } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import { inventoryService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CatalogTab = lazy(() => import('./components/CatalogTab'));
const GroupsTab = lazy(() => import('./components/GroupsTab'));

function ListaDePreciosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'catalogo');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewMakeDialogOpen, setIsNewMakeDialogOpen] = useState(false);
  const [newMakeName, setNewMakeName] = useState('');

  // Data states
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    setIsLoading(true);
    // Escuchar el catálogo maestro independiente
    const unsubs = [
      inventoryService.onMasterVehicleDataUpdate(setPriceLists),
      inventoryService.onVehicleGroupsUpdate((data) => {
        setGroups(data);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/listadeprecios?${params.toString()}`, { scroll: false });
  };

  const handleCreateMake = async () => {
    if (!newMakeName.trim()) return;
    try {
      // Crear marca en el catálogo maestro
      await inventoryService.createMasterMake(newMakeName);
      toast({ title: "Marca creada", description: `Se ha añadido ${newMakeName} al catálogo maestro.` });
      setIsNewMakeDialogOpen(false);
      setNewMakeName('');
    } catch (e) {
      toast({ title: "Error", description: "No se pudo crear la marca.", variant: "destructive" });
    }
  };

  const tabs = [
    { 
      value: 'catalogo', 
      label: 'Catálogo Maestro', 
      content: <CatalogTab priceLists={priceLists} /> 
    },
    { 
      value: 'grupos', 
      label: 'Grupos (Hermanados)', 
      content: <GroupsTab groups={groups} priceLists={priceLists} /> 
    },
  ];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setIsNewMakeDialogOpen(true)} className="bg-white">
        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Marca
      </Button>
    </div>
  );

  return (
    <>
      <TabbedPageLayout
        title="Catálogo Maestro Independiente"
        description="Gestión técnica de vehículos. Los datos aquí son independientes del catálogo de cotizaciones general."
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
        actions={actions}
      />

      <Dialog open={isNewMakeDialogOpen} onOpenChange={setIsNewMakeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Marca (Maestra)</DialogTitle>
            <DialogDescription>Añade una nueva marca a tu catálogo técnico independiente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de la Marca</Label>
              <Input 
                placeholder="Ej: TOYOTA, KIA, MG..." 
                value={newMakeName} 
                onChange={(e) => setNewMakeName(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewMakeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateMake} disabled={!newMakeName.trim()}>Crear Marca</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withSuspense(ListaDePreciosPage);
