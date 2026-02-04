
"use client";
import { usePathname, useRouter } from "next/navigation";
import { withSuspense } from "@/lib/withSuspense";
import { useMemo } from "react";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/hooks/use-sidebar"; 
import { Button } from "@/components/ui/button";
import {
  Settings,
  LogOut,
  LayoutGrid, Wrench, Receipt, Package, DollarSign, Users, 
  Truck, PlusCircle, ShoppingCart, FileJson, BrainCircuit, LifeBuoy, Tags, Car, ListOrdered
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, AppRole, NavigationEntry } from "@/types";
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services';
import { ALL_PERMISSIONS } from '@/lib/permissions';


const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  // Mi Taller
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: 'Mi Taller', permissions: ['services:create'] },
  { label: 'Tablero', path: '/tablero', icon: LayoutGrid, groupTag: 'Mi Taller', permissions: ['dashboard:view'] },
  { label: 'Servicios', path: '/servicios', icon: Wrench, groupTag: 'Mi Taller', permissions: ['services:view_history'] },
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: 'Mi Taller', permissions: ['vehicles:manage'] },
  { label: 'Precios', path: '/precios', icon: Tags, groupTag: 'Mi Taller', permissions: ['inventory:view_public_info'] },
  { label: 'Catálogo Maestro', path: '/listadeprecios', icon: ListOrdered, groupTag: 'Mi Taller', permissions: ['inventory:manage'] },
  { label: 'Flotilla', path: '/flotillav2', icon: Truck, groupTag: 'Mi Taller', permissions: ['fleet:manage'] },

  // Operaciones
  { label: 'Punto de Venta', path: '/pos', icon: Receipt, groupTag: 'Operaciones', permissions: ['pos:view_sales'] },
  { label: 'Inventario', path: '/inventario', icon: Package, groupTag: 'Operaciones', permissions: ['inventory:view_public_info'] },
  { label: 'Compras', path: '/inventario/compras', icon: ShoppingCart, groupTag: 'Operaciones', permissions: ['purchases:manage'] },
  
  // Finanzas
  { label: 'Reportes Taller', path: '/reportes', icon: DollarSign, groupTag: 'Finanzas', permissions: ['finances:view_report'] },
  { label: 'Facturación', path: '/facturacion', icon: FileJson, groupTag: 'Finanzas', permissions: ['billing:manage'] },

  // Opciones
  { label: 'I.A.', path: '/ai', icon: BrainCircuit, groupTag: 'Opciones', permissions: ['dashboard:view'] },
  { label: 'Personal', path: '/personal', icon: Users, groupTag: 'Opciones', permissions: ['personnel:manage'] },
  { label: 'Opciones', path: '/opciones', icon: Settings, groupTag: 'Opciones', permissions: ['dashboard:view'] },
];

const DESIRED_GROUP_ORDER = ['Mi Taller', 'Operaciones', 'Finanzas', 'Opciones'];

const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
        const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
        if (authUserString) {
            try { setCurrentUser(JSON.parse(authUserString)); } 
            catch (e) { console.error("Could not parse user from localStorage", e); }
        }
    }
    const unsub = adminService.onRolesUpdate(setRoles);
    return () => unsub();
  }, []);

  const userPermissions = React.useMemo(() => {
    if (!currentUser) return new Set<string>();
    if (currentUser.role === 'Superadministrador') {
        return new Set(ALL_PERMISSIONS.map(p => p.id));
    }
    const userRole = roles.find(r => r && r.name === currentUser.role);
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);

  const filteredNavStructure = React.useMemo(() => {
    if (!currentUser) return []; 
    return BASE_NAV_STRUCTURE.filter(item => item.permissions?.some(p => userPermissions.has(p)));
  }, [currentUser, userPermissions]);

  return filteredNavStructure.map(entry => ({
    ...entry,
    isActive: pathname === entry.path || (entry.path !== '/' && pathname.startsWith(entry.path!))
  }));
};

function AppSidebarInner({
  currentUser,
  onLogout,
}: {
  currentUser: User | null;
  onLogout: () => void;
}) {
  const router = useRouter();
  const navItems = useNavigation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogout = async () => {
    onLogout();
    router.push("/login");
  };

  const groupedByTag = React.useMemo(() => {
    return navItems.reduce((acc, item) => {
      const tag = item.groupTag ?? 'Otros';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
    }, {} as Record<string, NavigationEntry[]>);
  }, [navItems]);

  const sortedGroupEntries = React.useMemo(() => {
    return DESIRED_GROUP_ORDER.map(groupName => [
        groupName,
        groupedByTag[groupName] || [],
    ]).filter(group => (group[1] as NavigationEntry[]).length > 0);
  }, [groupedByTag]);

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="app-sidebar">
      <SidebarHeader className="border-b border-sidebar-border h-16 flex items-center justify-center">
        <Link
          href="/dashboard"
          className="flex items-center justify-center text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors h-full"
        >
          <div className="relative w-[120px] h-[30px]">
            <Image
                src="/ranoro-logo.png"
                alt="Ranoro Logo"
                fill
                style={{objectFit: 'contain'}}
                sizes="120px"
                data-ai-hint="ranoro logo"
            />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-0">
        {sortedGroupEntries.map(([tag, entriesInGroup]) => (
          <SidebarGroup key={tag as string} className="p-2">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="group-data-[collapsible=icon]:hidden uppercase text-[10px] tracking-widest font-bold">
                {tag as string}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(entriesInGroup as NavigationEntry[]).map((entry) => (
                  <SidebarMenuItem key={entry.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={entry.isActive}
                      tooltipLabel={entry.label}
                    >
                      <Link href={entry.path!} onClick={() => { if(isMobile) setOpenMobile(false) }}>
                        {React.createElement(entry.icon as any)}
                        <span className="group-data-[collapsible=icon]:hidden">
                          {entry.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 py-2 text-left hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"
            >
              <div className="group-data-[collapsible=icon]:hidden flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-semibold truncate w-full">
                      {currentUser?.name || "Mi Cuenta"}
                  </span>
                  <span className="text-[10px] uppercase opacity-70">
                      {String(currentUser?.role ?? 'Usuario')}
                  </span>
              </div>
              <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center h-8 w-8 rounded-full bg-sidebar-accent">
                 <span className="text-sm font-bold">
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                 </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>{currentUser?.name || "Mi Cuenta"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/opciones?tab=perfil"><Users className="mr-2 h-4 w-4" /> Mi Perfil</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/opciones?tab=manual"><LifeBuoy className="mr-2 h-4 w-4" /> Manual</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Salir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const AppSidebar = withSuspense(AppSidebarInner, <div className="w-64 p-4">Cargando...</div>);
export default AppSidebar;
