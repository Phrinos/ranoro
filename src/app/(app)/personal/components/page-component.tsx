

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, AppRole } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Shield, TrendingUp, BookOpen, DatabaseZap } from 'lucide-react';
import { adminService, operationsService, inventoryService } from '@/lib/services';
import { RendimientoPersonalContent } from './rendimiento-content';
import { UsuariosPageContent } from './usuarios-content';
import { RolesPageContent } from '../../administracion/components/roles-content';

export function PersonalPageComponent({ tab }: { tab?: string }) {
  const { toast } = useToast();
  const defaultTab = tab || 'rendimiento';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
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
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-primary-foreground/80 mt-1">Administra tu equipo, sus roles, permisos y analiza su rendimiento.</p>
      </div>
      
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
            <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                <TabsTrigger value="rendimiento" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                    <TrendingUp className="h-5 w-5 mr-2"/>Rendimiento
                </TabsTrigger>
                <TabsTrigger value="usuarios" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                    <Users className="h-5 w-5 mr-2"/>Usuarios
                </TabsTrigger>
                <TabsTrigger value="roles" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">
                    <Shield className="h-5 w-5 mr-2"/>Roles y Permisos
                </TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="rendimiento" className="mt-6">
            <RendimientoPersonalContent />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-6">
            <UsuariosPageContent currentUser={allUsers.find(u => u.role === 'Superadministrador') || null} initialUsers={allUsers} initialRoles={allRoles} />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
            <RolesPageContent currentUser={allUsers.find(u => u.role === 'Superadministrador') || null} initialRoles={allRoles} />
        </TabsContent>
      </Tabs>
    </>
  );
}
