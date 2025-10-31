
// src/app/(app)/personal/page.tsx

"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, AppRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, TrendingUp, BookOpen, DatabaseZap } from 'lucide-react';
import { adminService, serviceService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

const RendimientoPersonalContent = lazy(() => import('./components/rendimiento-content').then(m => ({ default: m.RendimientoPersonalContent })));
const ComisionesContent = lazy(() => import('./components/comisiones-content'));
const UsuariosPageContent = lazy(() => import('./components/usuarios-content').then(m => ({ default: m.UsuariosPageContent })));
const RolesPageContent = lazy(() => import('./components/roles-content').then(m => ({ default: m.RolesPageContent })));

function PageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
    
  const { toast } = useToast();
  const defaultTab = tab || 'rendimiento';
  const [activeTab, setActiveTab] = useState(defaultTab);
    
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allRoles, setAllRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) {
      try {
        setCurrentUser(JSON.parse(authUserString));
      } catch (e) {
        console.error("Error parsing auth user from localStorage", e);
      }
    }

    const unsubs: (() => void)[] = [
      adminService.onUsersUpdate(setAllUsers),
      serviceService.onServicesUpdate(setAllServices),
      adminService.onRolesUpdate((roles) => {
        setAllRoles(roles);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    
  const tabs = [
    { value: "rendimiento", label: "Rendimiento", content: <Suspense fallback={<Loader2 className="animate-spin" />}><RendimientoPersonalContent /></Suspense> },
    { value: "comisiones", label: "Comisiones", content: <Suspense fallback={<Loader2 className="animate-spin" />}><ComisionesContent allServices={allServices} allUsers={allUsers} /></Suspense> },
    { value: "usuarios", label: "Personal", content: <Suspense fallback={<Loader2 className="animate-spin" />}><UsuariosPageContent currentUser={currentUser} initialUsers={allUsers} initialRoles={allRoles} /></Suspense> },
    { value: "roles", label: "Roles y Permisos", content: <Suspense fallback={<Loader2 className="animate-spin" />}><RolesPageContent currentUser={currentUser} initialRoles={allRoles} /></Suspense> },
  ];

  return (
    <TabbedPageLayout
      title="Gestión de Personal"
      description="Administra tu equipo, sus roles, permisos y analiza su rendimiento."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    />
  );
}

export default withSuspense(PageInner, null);
