// src/app/(app)/personal/page.tsx

"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, AppRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, TrendingUp, BookOpen, DatabaseZap } from 'lucide-react';
import { adminService, serviceService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

const RendimientoPersonalContent = lazy(() => import('./components/rendimiento-content').then(m => ({ default: m.RendimientoPersonalContent })));
const UsuariosPageContent = lazy(() => import('./components/usuarios-content').then(m => ({ default: m.UsuariosPageContent })));
const RolesPageContent = lazy(() => import('./components/roles-content').then(m => ({ default: m.RolesPageContent })));

function PersonalPage() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    const { toast } = useToast();
    const defaultTab = tab || 'rendimiento';
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    const [allUsers, setAllUsers] = useState<User[]>([]);
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

export default function PersonalPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PersonalPage />
    </Suspense>
  );
}
