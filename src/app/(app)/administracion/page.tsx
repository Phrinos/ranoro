// src/app/(app)/administracion/page.tsx

"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, AppRole, AuditLog } from '@/types';
import { adminService } from '@/lib/services';
import { AuditoriaPageContent } from "./components/auditoria-content";
import { MigracionPageContent } from "./components/migracion-content";
import { RegistroIndividualContent } from './components/registro-individual-content';
import { Loader2 } from "lucide-react";
import { Shield, Users, BookOpen, DatabaseZap, MessageSquare } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { MensajeriaPageContent } from "./components/mensajeria-content";

function AdministracionPageComponent() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    const defaultSubTab = tab || 'auditoria';
    const [activeTab, setAdminTab] = useState(defaultSubTab);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            adminService.onAuditLogsUpdate((logs) => {
                setAuditLogs(logs);
                setIsLoading(false);
            })
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, []);
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Administración del Sistema</h1>
                <p className="text-primary-foreground/80 mt-1">Gestiona usuarios, roles y realiza migraciones de datos.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setAdminTab} className="w-full">
                <div className="w-full">
                    <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                        <TabsTrigger value="auditoria" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                             <BookOpen className="h-5 w-5 mr-2"/>Auditoría
                        </TabsTrigger>
                        <TabsTrigger value="migracion" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            <DatabaseZap className="h-5 w-5 mr-2"/>Migración de Datos
                        </TabsTrigger>
                    </TabsList>
                </div>
                 <TabsContent value="auditoria" className="mt-6">
                    <AuditoriaPageContent initialLogs={auditLogs} />
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
        </>
    );
}

export default function AdministracionPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AdministracionPageComponent />
    </Suspense>
  );
}
