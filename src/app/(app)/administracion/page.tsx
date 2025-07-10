
"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

import { UsuariosPageContent } from "./components/usuarios-content";
import { RolesPageContent } from "./components/roles-content";
import { AuditoriaPageContent } from "./components/auditoria-content";
import { MigracionPageContent } from "./components/migracion-content";

function AdministracionPageComponent() {
    const searchParams = useSearchParams();
    const defaultSubTab = searchParams.get('tab') || 'usuarios';
    const [adminTab, setAdminTab] = useState(defaultSubTab);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

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
            
            <Tabs value={adminTab} onValueChange={setAdminTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Usuarios</TabsTrigger>
                    <TabsTrigger value="roles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Roles y Permisos</TabsTrigger>
                    <TabsTrigger value="auditoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Auditoría</TabsTrigger>
                    <TabsTrigger value="migracion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Migración de Datos</TabsTrigger>
                </TabsList>
                <TabsContent value="usuarios" className="mt-0">
                    <UsuariosPageContent currentUser={currentUser} />
                </TabsContent>
                <TabsContent value="roles" className="mt-0">
                    <RolesPageContent />
                </TabsContent>
                 <TabsContent value="auditoria" className="mt-0">
                    <AuditoriaPageContent />
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
