

"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, AppRole, ServiceTypeRecord } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { adminService, inventoryService } from '@/lib/services';
import { Loader2, BookOpen, Settings, UserCircle, Building, Shapes } from 'lucide-react';

// Import all content components
import { PerfilPageContent } from './components/perfil-content';
import { ConfigTallerPageContent } from './components/config-taller-content';
import { ConfiguracionTicketPageContent } from './components/config-ticket-content';
import { TiposDeServicioPageContent } from './components/service-types-content';
import { ManualUsuarioPageContent } from './components/manual-content';


function OpcionesPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'perfil';
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    // Unified state for all necessary data
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
            const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
            setCurrentUser(authUserString ? JSON.parse(authUserString) : defaultSuperAdmin);
            
            const [fetchedRoles, fetchedServiceTypes] = await Promise.all([
                adminService.getRoles(),
                inventoryService.onServiceTypesUpdatePromise()
            ]);
            
            setRoles(fetchedRoles);
            setServiceTypes(fetchedServiceTypes);

        } catch (error) {
            console.error("Error loading options page data:", error);
        } finally {
            setIsLoading(false);
        }
      };
      loadData();
    }, []);

    const userPermissions = useMemo(() => {
        if (!currentUser || !roles.length) {
          // If roles haven't loaded, but we are the default superadmin, grant all permissions.
          if (currentUser?.id === defaultSuperAdmin.id) {
              const superAdminRole = placeholderAppRoles.find(r => r.name === 'Superadministrador');
              return new Set(superAdminRole?.permissions || []);
          }
          return new Set<string>();
        }
        const userRole = roles.find(r => r && r.name === currentUser.role);
        return new Set(userRole?.permissions || []);
    }, [currentUser, roles]);
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-3">Cargando opciones...</span>
        </div>
      );
    }
    
    const tabs = [
        { value: "perfil", label: "Mi Perfil", icon: UserCircle, component: <PerfilPageContent />, requiredPermission: 'dashboard:view' },
        { value: "taller", label: "Mi Taller", icon: Building, component: <ConfigTallerPageContent />, requiredPermission: 'workshop:manage' },
        { value: "ticket", label: "Ticket", icon: Settings, component: <ConfiguracionTicketPageContent />, requiredPermission: 'ticket_config:manage' },
        { value: "service_types", label: "Tipos de Servicio", icon: Shapes, component: <TiposDeServicioPageContent serviceTypes={serviceTypes}/>, requiredPermission: 'roles:manage' },
        { value: "manual", label: "Manual", icon: BookOpen, component: <ManualUsuarioPageContent />, requiredPermission: 'dashboard:view' },
    ];
    
    const availableTabs = tabs.filter(tab => tab.requiredPermission && userPermissions.has(tab.requiredPermission));

    return (
      <>
        <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Opciones y Configuración</h1>
          <p className="text-primary-foreground/80 mt-1">Gestiona tu perfil, el sistema y la configuración general.</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6">
                {availableTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                        <tab.icon className="h-5 w-5"/>{tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            
            {availableTabs.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0">
                    {tab.component}
                </TabsContent>
            ))}
        </Tabs>
      </>
    );
}

export default function OpcionesPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <OpcionesPageComponent />
        </Suspense>
    );
}
