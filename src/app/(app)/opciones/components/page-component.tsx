
"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, AppRole, ServiceTypeRecord } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { adminService, inventoryService } from '@/lib/services';
import { Loader2, BookOpen, Settings, UserCircle, Building, Shapes } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

// Import all content components
import { PerfilPageContent } from './perfil-content';
import { ConfigTallerPageContent } from './config-taller-content';
import { ConfiguracionTicketPageContent } from './config-ticket-content';
import { TiposDeServicioPageContent } from './service-types-content';
import { ManualUsuarioPageContent } from './manual-content';

export function OpcionesPageComponent({ tab }: { tab?: string }) {
  const [activeTab, setActiveTab] = useState(tab || 'perfil');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    setCurrentUser(authUserString ? JSON.parse(authUserString) : defaultSuperAdmin);

    const unsubs = [
      adminService.onRolesUpdate(setRoles),
      inventoryService.onServiceTypesUpdate(setServiceTypes)
    ];

    setIsLoading(false);

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const userPermissions = useMemo(() => {
    if (!currentUser || !roles.length) {
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
    { value: "service_types", label: "Tipos de Servicio", icon: Shapes, component: <TiposDeServicioPageContent serviceTypes={serviceTypes} />, requiredPermission: 'roles:manage' },
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
        <div className="w-full">
            <TabsList className="flex w-full overflow-x-auto gap-2 scrollbar-hide px-1 py-1 h-auto">
              {availableTabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors
                    data-[state=active]:bg-primary data-[state=active]:text-primary-foreground 
                    data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground"
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
        </div>

        {availableTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
