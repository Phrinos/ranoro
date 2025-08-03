

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, AppRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, TrendingUp, BookOpen, DatabaseZap } from 'lucide-react';
import { adminService, operationsService, inventoryService } from '@/lib/services';
import { RendimientoPersonalContent } from './rendimiento-content';
import { UsuariosPageContent } from './usuarios-content';
import { RolesPageContent } from '../../administracion/components/roles-content';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

export function PersonalPageComponent({ tab }: { tab?: string }) {
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
    { value: "rendimiento", label: "Rendimiento", content: <RendimientoPersonalContent /> },
    { value: "usuarios", label: "Personal", content: <UsuariosPageContent currentUser={currentUser} initialUsers={allUsers} initialRoles={allRoles} /> },
    { value: "roles", label: "Roles y Permisos", content: <RolesPageContent currentUser={currentUser} initialRoles={allRoles} /> },
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
