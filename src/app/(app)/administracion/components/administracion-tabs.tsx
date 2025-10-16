
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { withSuspense } from "@/lib/withSuspense";
import { Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditoriaPageContent } from "./auditoria-content";
import { MigracionPageContent } from "./migracion-content";
import { RegistroIndividualContent } from "./registro-individual-content";
import { BookOpen, DatabaseZap, Loader2 } from "lucide-react";

const Fallback = (
  <div className="flex h-64 w-full items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);

function AdministracionTabsInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const activeTab = sp.get("tab") ?? "auditoria";

  const handleTabChange = (tab: string) => {
    const newParams = new URLSearchParams(sp.toString());
    newParams.set('tab', tab);
    router.replace(`?${newParams.toString()}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="w-full">
        <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
          <TabsTrigger
            value="auditoria"
            className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Auditoría
          </TabsTrigger>
          <TabsTrigger
            value="migracion"
            className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80"
          >
            <DatabaseZap className="h-5 w-5 mr-2" />
            Migración de Datos
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="auditoria" className="mt-6">
        <Suspense fallback={Fallback}>
          <AuditoriaPageContent initialLogs={[]} />
        </Suspense>
      </TabsContent>

      <TabsContent value="migracion" className="mt-6">
        <Tabs defaultValue="masiva" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="masiva">Migración Masiva (IA)</TabsTrigger>
            <TabsTrigger value="individual">Registro Individual</TabsTrigger>
          </TabsList>
          <TabsContent value="masiva" className="mt-4">
            <MigracionPageContent />
          </TabsContent>
          <TabsContent value="individual" className="mt-4">
            <RegistroIndividualContent />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

export const AdministracionTabs = withSuspense(AdministracionTabsInner, null);
export default AdministracionTabs;
