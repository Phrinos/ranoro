
"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services/admin.service';

import { UsuariosPageContent } from "./components/usuarios-content";
import { RolesPageContent } from "./components/roles-content";
import { AuditoriaPageContent } from "./components/auditoria-content";
import { MigracionPageContent } from "./components/migracion-content";

function AdministracionPageComponent() {
    const searchParams = useSearchParams();
    const defaultSubTab = searchParams.get('tab') || 'usuarios';
    const [activeTab, setAdminTab] = useState(defaultSubTab);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [version, setVersion] = useState(0);

    const forceUpdate = useCallback(() => {
        setVersion(v => v + 1);
        adminService.getUsers().then(users => {
            const user = users.find(u => u.id === currentUser?.id);
            if (user) setCurrentUser(user);
        });
    }, [currentUser?.id]);
    
    useEffect(() => {
        window.addEventListener('databaseUpdated', forceUpdate);
        return () => window.removeEventListener('databaseUpdated', forceUpdate);
    }, [forceUpdate]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
            if (authUserString) {
                try {
                    setCurrentUser(JSON.parse(authUserString));
                } catch (e) {
                    console.error("Failed to parse authUser for admin page:", e);
                }
            }
        }
    }, []);

    return (
        <>
            <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Administración del Sistema</h1>
                <p className="text-primary-foreground/80 mt-1">Gestiona usuarios, roles y realiza migraciones de datos.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setAdminTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Usuarios</TabsTrigger>
                    <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Roles y Permisos</TabsTrigger>
                    <TabsTrigger value="auditoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Auditoría</TabsTrigger>
                    <TabsTrigger value="migracion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Migración de Datos</TabsTrigger>
                </TabsList>
                <TabsContent value="usuarios" className="mt-0">
                    <UsuariosPageContent currentUser={currentUser} key={`users-${version}`} />
                </TabsContent>
                <TabsContent value="roles" className="mt-0">
                    <RolesPageContent key={`roles-${version}`} />
                </TabsContent>
                 <TabsContent value="auditoria" className="mt-0">
                    <AuditoriaPageContent key={`audit-${version}`} />
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
