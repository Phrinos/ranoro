
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
  LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, 
  Truck, LineChart, Shield, PlusCircle, Landmark, LayoutGrid, CalendarDays, 
  MessageSquare, Car, ShoppingCart, FileJson, Building, BarChart3, Wallet, BrainCircuit, LifeBuoy, Tags, FileBarChart
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
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services';
import { ALL_PERMISSIONS } from '@/lib/permissions';


const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  // Mi Taller
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: 'Mi Taller', permissions: ['services:create'] },
  { label: 'Tablero', path: '/tablero', icon: LayoutGrid, groupTag: 'Mi Taller', permissions: ['dashboard:view'] },
  { label: 'Servicios', path: '/servicios', icon: Wrench, groupTag: 'Mi Taller', permissions: ['services:view_history'] },
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: 'Mi Taller', permissions: ['vehicles:manage'] },
  { label: 'Precios', path: '/precios', icon: Tags, groupTag: 'Mi Taller', permissions: ['inventory:view_public_info'] },
  { label: 'Flotilla', path: '/flotilla', icon: Truck, groupTag: 'Mi Taller', permissions: ['fleet:manage'] },

  // Operaciones
  { label: 'Punto de Venta', path: '/pos', icon: Receipt, groupTag: 'Operaciones', permissions: ['pos:view_sales'] },
  { label: 'Inventario', path: '/inventario', icon: Package, groupTag: 'Operaciones', permissions: ['inventory:view_public_info'] },
  { label: 'Compras', path: '/inventario/compras', icon: ShoppingCart, groupTag: 'Operaciones', permissions: ['purchases:manage'] },
  
  // Finanzas
  { label: 'Finanzas y Reportes', path: '/reportes', icon: DollarSign, groupTag: 'Finanzas', permissions: ['finances:view_report'] },
  { label: 'Reportes Flotilla', path: '/flotillareportes', icon: Truck, groupTag: 'Finanzas', permissions: ['fleet:manage'] },
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

  const entriesWithActiveState = filteredNavStructure.map(entry => {
    let isActive = false;
    if (!entry.path) return { ...entry, isActive };

    const cleanPathname = pathname.split('?')[0];
    const cleanEntryPath = entry.path.split('?')[0];

    if (cleanPathname === cleanEntryPath) {
        isActive = true;
    }

    const parentRoutes = ['/servicios', '/vehiculos', '/pos', '/inventario', '/inventario/proveedores', '/inventario/compras', '/personal', '/opciones', '/facturacion', '/ai', '/flotilla', '/reportes', '/precios', '/flotillareportes'];
    
    if (parentRoutes.includes(cleanEntryPath) && cleanPathname.startsWith(cleanEntryPath)) {
        if (cleanPathname === cleanEntryPath) {
            isActive = true;
        } else if (cleanPathname.startsWith(cleanEntryPath + '/')) {
            const isMoreSpecificEntryActive = filteredNavStructure.some(e => e.path === cleanPathname);
            if (!isMoreSpecificEntryActive) {
                isActive = true;
            }
        }
    }
    
    if (pathname === '/servicios/nuevo' && entry.path === '/servicios') {
      isActive = false;
    }

    return { ...entry, isActive };
  });
  
  const groupedByTag = entriesWithActiveState.reduce((acc, item) => {
      const tag = item.groupTag ?? 'Otros';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
    }, {} as Record<string, NavigationEntry[]>);

  const sortedGroupEntries = DESIRED_GROUP_ORDER.reduce((acc, groupName) => {
    if (groupedByTag[groupName]) {
      const groupItems = groupedByTag[groupName].sort((a, b) => {
        const indexA = BASE_NAV_STRUCTURE.findIndex(nav => nav.path === a.path && nav.groupTag === a.groupTag);
        const indexB = BASE_NAV_STRUCTURE.findIndex(nav => nav.path === b.path && nav.groupTag === b.groupTag);
        return indexA - indexB;
      });
      acc.push(...groupItems);
    }
    return acc;
  }, [] as NavigationEntry[]);
  
  return sortedGroupEntries;
};

function AppSidebarInner({
  currentUser,
  onLogout,
}: {
  currentUser: User | null;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = useNavigation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogout = async () => {
    onLogout();
    router.push("/login");
  };

  const groupedByTag = React.useMemo(() => {
    return navItems.reduce((acc, item) => {
      const tag = item.groupTag ?? 'Otros';
      if (!acc[tag]) {
        acc[tag] = [];
      }
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
              <span className="group-data-[collapsible=icon]:hidden">
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
                      tooltipClassName="group-data-[collapsible=icon]:block hidden"
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
      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2 flex flex-col gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 py-2 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center"
            >
              <div className="group-data-[collapsible=icon]:hidden flex flex-col items-start">
                  <span className="text-sm font-semibold leading-none">
                      {currentUser?.name || "Mi Cuenta"}
                  </span>
                  <span className="text-xs text-sidebar-foreground/80 leading-none">
                      {String(currentUser?.role ?? 'Rol')}
                  </span>
              </div>
              <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center h-8 w-8 rounded-full bg-sidebar-accent">
                 <span className="text-sm font-semibold">
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                 </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="mb-1 w-[var(--sidebar-width-icon)] group-data-[state=expanded]:w-[var(--sidebar-width)] sm:w-[var(--sidebar-width-mobile)] md:w-56"
          >
            <DropdownMenuLabel>
              {currentUser?.name || "Mi Cuenta"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/opciones?tab=perfil"><Users className="mr-2 h-4 w-4" /> Mi Perfil</Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
               <Link href="/opciones?tab=manual"><LifeBuoy className="mr-2 h-4 w-4" /> Manual de Uso</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={handleLogout}>
                   <LogOut className="mr-2 h-4 w-4 text-destructive" />
                   <span className="text-destructive">Salir</span>
                 </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const AppSidebar = withSuspense(AppSidebarInner, <div className="w-64 p-4">Cargando menú…</div>);
export default AppSidebar;
