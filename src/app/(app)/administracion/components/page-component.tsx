

"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, AppRole, AuditLog } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services';
import { UsuariosPageContent } from "./usuarios-content";
import { RolesPageContent } from "./roles-content";
import { AuditoriaPageContent } from "./auditoria-content";
import { MigracionPageContent } from "./migracion-content";
import { RegistroIndividualContent } from './registro-individual-content';
import { Loader2 } from "lucide-react";
import { Shield, Users, BookOpen, DatabaseZap } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";


export function AdministracionPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
    const defaultSubTab = (searchParams?.tab as string) || 'usuarios';
    const [activeTab, setAdminTab] = useState(defaultSubTab);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        if (authUserString) setCurrentUser(JSON.parse(authUserString));

        const unsubs = [
            adminService.onUsersUpdate(setUsers),
            adminService.onRolesUpdate(setRoles),
            adminService.onAuditLogsUpdate((logs) => {
                setAuditLogs(logs);
                setIsLoading(false); // Consider loading finished after the last subscription is active
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
                <div className="w-full overflow-x-auto scrollbar-hide">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                        <TabsTrigger value="usuarios" className="flex-1 min-w-[150px] text-center px-4 py-2 rounded-md transition-colors duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            <Users className="h-5 w-5 mr-2"/>Usuarios
                        </TabsTrigger>
                        <TabsTrigger value="roles" className="flex-1 min-w-[150px] text-center px-4 py-2 rounded-md transition-colors duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            <Shield className="h-5 w-5 mr-2"/>Roles y Permisos
                        </TabsTrigger>
                        <TabsTrigger value="auditoria" className="flex-1 min-w-[150px] text-center px-4 py-2 rounded-md transition-colors duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                             <BookOpen className="h-5 w-5 mr-2"/>Auditoría
                        </TabsTrigger>
                        <TabsTrigger value="migracion" className="flex-1 min-w-[150px] text-center px-4 py-2 rounded-md transition-colors duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                            <DatabaseZap className="h-5 w-5 mr-2"/>Migración de Datos
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="usuarios" className="mt-6">
                    <UsuariosPageContent currentUser={currentUser} initialUsers={users} initialRoles={roles} />
                </TabsContent>
                <TabsContent value="roles" className="mt-6">
                    <RolesPageContent currentUser={currentUser} initialRoles={roles} />
                </TabsContent>
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
