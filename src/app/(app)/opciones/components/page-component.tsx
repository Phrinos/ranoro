

"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, AppRole, ServiceTypeRecord } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { adminService, inventoryService } from '@/lib/services';
import { Loader2, BookOpen, Settings, UserCircle, Building, Shapes } from 'lucide-react';

// Import all content components
import { PerfilPageContent } from './perfil-content';
import { ConfigTallerPageContent } from './config-taller-content';
import { ConfiguracionTicketPageContent } from './config-ticket-content';
import { TiposDeServicioPageContent } from './service-types-content';
import { ManualUsuarioPageContent } from './manual-content';

const MemoizedPerfilPageContent = React.memo(PerfilPageContent);
const MemoizedConfigTallerPageContent = React.memo(ConfigTallerPageContent);
const MemoizedConfiguracionTicketPageContent = React.memo(ConfiguracionTicketPageContent);
const MemoizedTiposDeServicioPageContent = React.memo(TiposDeServicioPageContent);
const MemoizedManualUsuarioPageContent = React.memo(ManualUsuarioPageContent);

export function OpcionesPageComponent({ tab: initialTab }: { tab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'perfil');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    
    try {
        setCurrentUser(authUserString ? JSON.parse(authUserString) : defaultSuperAdmin);
    } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        setCurrentUser(defaultSuperAdmin);
    }

    const unsubs = [
      adminService.onRolesUpdate(setRoles),
      inventoryService.onServiceTypesUpdate(setServiceTypes)
    ];

    setIsLoading(false);

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const userPermissions = useMemo(() => {
    if (!currentUser) return new Set<string>();
    
    if (currentUser.id === defaultSuperAdmin.id) {
      const superAdminRole = placeholderAppRoles.find(r => r.name === 'Superadministrador');
      return new Set(superAdminRole?.permissions || []);
    }

    const userRole = roles.find(r => r?.name === currentUser.role);
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);

  const tabs = useMemo(() => [
    { value: "perfil", label: "Mi Perfil", icon: UserCircle, component: <MemoizedPerfilPageContent />, requiredPermission: 'dashboard:view' },
    { value: "taller", label: "Mi Taller", icon: Building, component: <MemoizedConfigTallerPageContent />, requiredPermission: 'workshop:manage' },
    { value: "ticket", label: "Ticket", icon: Settings, component: <MemoizedConfiguracionTicketPageContent />, requiredPermission: 'ticket_config:manage' },
    { value: "service_types", label: "Tipos de Servicio", icon: Shapes, component: <MemoizedTiposDeServicioPageContent serviceTypes={serviceTypes} />, requiredPermission: 'roles:manage' },
    { value: "manual", label: "Manual", icon: BookOpen, component: <MemoizedManualUsuarioPageContent />, requiredPermission: 'dashboard:view' },
  ], [serviceTypes]);

  const availableTabs = useMemo(() => tabs.filter(tab => tab.requiredPermission && userPermissions.has(tab.requiredPermission)), [tabs, userPermissions]);

  useEffect(() => {
    // If the current active tab is not in the available tabs, default to the first available one
    if (availableTabs.length > 0 && !availableTabs.some(t => t.value === activeTab)) {
      setActiveTab(availableTabs[0].value);
    }
  }, [availableTabs, activeTab]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando opciones...</span>
      </div>
    );
  }
  
  return (
    <>
      <header className="bg-card border rounded-lg p-6 mb-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Opciones y Configuración</h1>
        <p className="text-muted-foreground mt-1">Gestiona tu perfil, el sistema y la configuración general.</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} aria-label={`Ir a la pestaña ${tab.label}`}>
              <tab.icon className="h-5 w-5 mr-2 flex-shrink-0" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            {availableTabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="mt-6 focus-visible:ring-0 focus-visible:ring-offset-0">
                {activeTab === tab.value && tab.component}
              </TabsContent>
            ))}
        </Suspense>
      </Tabs>
    </>
  );
}
