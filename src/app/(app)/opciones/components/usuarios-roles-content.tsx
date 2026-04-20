import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Users, ShieldAlert, UserCircle } from 'lucide-react';
import { TabbedPageLayout } from '@/components/layout/tabbed-page-layout';

import type { User, AppRole } from '@/types';
import { adminService } from '@/lib/services';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

import { UsuariosPageContent } from '@/app/(app)/usuarios/components/usuarios-content';
import { RolesPageContent } from '@/app/(app)/usuarios/components/roles-content';
import { PerfilPageContent } from './perfil-content';

export function UsuariosRolesContent() {
  const [activeTab, setActiveTab] = useState('perfil');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const tabConfigs = useMemo(() => [
    {
      value: "perfil",
      label: "Mi Perfil",
      icon: <UserCircle className="w-4 h-4" />,
      content: <PerfilPageContent />
    },
    {
      value: "personal",
      label: "Personal",
      icon: <Users className="w-4 h-4" />,
      content: <UsuariosPageContent currentUser={currentUser} initialUsers={allUsers} initialRoles={allRoles} />
    },
    {
      value: "roles",
      label: "Roles y Permisos",
      icon: <ShieldAlert className="w-4 h-4" />,
      content: <RolesPageContent currentUser={currentUser} initialRoles={allRoles} />
    }
  ], [currentUser, allUsers, allRoles]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 border rounded-lg bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando personal y roles...</span>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-xs">
      <TabbedPageLayout
        title=""
        tabs={tabConfigs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
