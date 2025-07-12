
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, AppRole, AuditLog } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services';
import { UsuariosPageContent } from "./components/usuarios-content";
import { RolesPageContent } from "./components/roles-content";
import { AuditoriaPageContent } from "./components/auditoria-content";
import { MigracionPageContent } from "./components/migracion-content";
import { Loader2 } from "lucide-react";
import { Shield, Users, BookOpen, DatabaseZap } from 'lucide-react';


function AdministracionPageComponent() {
    const searchParams = useSearchParams();
    const defaultSubTab = searchParams.get('tab') || 'usuarios';
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
                <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                        <Users className="h-5 w-5"/>Usuarios
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                        <Shield className="h-5 w-5"/>Roles y Permisos
                    </TabsTrigger>
                    <TabsTrigger value="auditoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                         <BookOpen className="h-5 w-5"/>Auditoría
                    </TabsTrigger>
                    <TabsTrigger value="migracion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                        <DatabaseZap className="h-5 w-5"/>Migración de Datos
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="usuarios" className="mt-0">
                    <UsuariosPageContent currentUser={currentUser} initialUsers={users} initialRoles={roles} />
                </TabsContent>
                <TabsContent value="roles" className="mt-0">
                    <RolesPageContent currentUser={currentUser} initialRoles={roles} />
                </TabsContent>
                 <TabsContent value="auditoria" className="mt-0">
                    <AuditoriaPageContent initialLogs={auditLogs} />
                </TabsContent>
                <TabsContent value="migracion" className="mt-0">
                    <MigracionPageContent />
                </TabsContent>
            </Tabs>
        </>
    );
}

export default function AdministracionPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <AdministracionPageComponent />
        </Suspense>
    );
}
