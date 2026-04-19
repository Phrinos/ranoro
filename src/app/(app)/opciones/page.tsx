
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { Loader2, Settings, Building, Shapes, Wrench, FileJson } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';
import type { User, AppRole, ServiceTypeRecord } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { inventoryService } from '@/lib/services';
import { useRoles } from '@/lib/contexts/roles-context';
const ConfigTallerPageContent = lazy(() => import('./components/config-taller-content').then(module => ({ default: module.ConfigTallerPageContent })));
const ConfiguracionTicketPageContent = lazy(() => import('./components/config-ticket-content').then(module => ({ default: module.ConfiguracionTicketPageContent })));
const ConfigMantenimientoPageContent = lazy(() => import('./components/config-mantenimiento-content').then(module => ({ default: module.ConfigMantenimientoPageContent })));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTabQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(activeTabQuery || 'taller');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const roles = useRoles(); // Usa el contexto centralizado — sin listener propio
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

    const unsub = inventoryService.onServiceTypesUpdate(setServiceTypes);
    setIsLoading(false);
    return () => unsub();
  }, []);
  
  const userPermissions = useMemo(() => {
    if (!currentUser) return new Set<string>();
    
    if (currentUser.id === defaultSuperAdmin.id || currentUser.role === 'Superadministrador') {
      const superAdminRole = placeholderAppRoles.find(r => r.name === 'Superadministrador');
      return new Set(superAdminRole?.permissions || []);
    }

    const userRole = roles.find(r => r?.name === currentUser.role);
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);

  const tabs = useMemo(() => [
    { value: "taller", label: "Mi Taller", icon: Building, component: <ConfigTallerPageContent />, requiredPermission: 'admin:settings' },
    { value: "ticket", label: "Ticket", icon: Settings, component: <ConfiguracionTicketPageContent />, requiredPermission: 'admin:settings' },
    { value: "mantenimiento", label: "Mantenimiento", icon: Wrench, component: <ConfigMantenimientoPageContent />, requiredPermission: 'admin:settings' },
  ], []);

  const availableTabs = useMemo(() => tabs.filter(tab => tab.requiredPermission && userPermissions.has(tab.requiredPermission)), [tabs, userPermissions]);

  const tabConfigs = useMemo(() => {
    return availableTabs.map(tab => ({
      value: tab.value,
      label: tab.label,
      icon: <tab.icon className="w-4 h-4" />,
      content: (
        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          {tab.component}
        </Suspense>
      )
    }));
  }, [availableTabs]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando opciones...</span>
      </div>
    );
  }
  
  return (
    <TabbedPageLayout
      title="Opciones y Configuración"
      description="Gestiona tu perfil, el personal y la configuración general del taller."
      activeTab={activeTab}
      onTabChange={(v) => {
        setActiveTab(v);
        router.push(`${pathname}?tab=${v}`);
      }}
      tabs={tabConfigs}
    />
  );
}

export default withSuspense(PageInner, null);
