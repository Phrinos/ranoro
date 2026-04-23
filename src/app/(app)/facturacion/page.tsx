"use client";

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const InvoicesListTab = dynamic(
  () => import("./components/invoices-list-tab").then(m => m.InvoicesListTab),
  { ssr: false, loading: () => <LoadingPlaceholder /> }
);

const FacturapiConfigTab = dynamic(
  () => import("./components/facturapi-config-tab").then(m => m.FacturapiConfigTab),
  { ssr: false, loading: () => <LoadingPlaceholder /> }
);

function LoadingPlaceholder() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function FacturacionPageInner() {
  const [activeTab, setActiveTab] = useState<"lista" | "config">("lista");

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6 pl-4 border-l-[3px] border-primary">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Facturación Facturapi</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          Gestiona la facturación electrónica SAT de tu taller y configura las credenciales de tu portal público.
        </p>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border mb-6 inline-flex max-w-full overflow-x-auto">
          <TabsTrigger value="lista" className="rounded-xl gap-2 px-4 sm:px-6">
            <FileText className="h-4 w-4 shrink-0" />
            <span>Lista de Facturas</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl gap-2 px-4 sm:px-6">
            <Settings className="h-4 w-4 shrink-0" />
            <span>Configuración</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-0">
          <InvoicesListTab />
        </TabsContent>

        <TabsContent value="config" className="mt-0">
          <FacturapiConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withSuspense(FacturacionPageInner, null);
