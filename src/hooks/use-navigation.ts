
"use client";

import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutDashboard,
  List,
  History,
  PlusCircle,
  Shapes,
  Car,
  UserCog,
  Users,
  ShoppingCart,
  DatabaseZap,
  LucideIcon,
  type Icon,
  Archive,
  Wrench,
  Package,
  Settings,
  Building,
  CalendarClock,
  DollarSign,
  Receipt,
  LineChart,
  ShieldQuestion,
  FileText, 
  ClipboardList, 
  BarChart3, 
  Briefcase,
  BarChartHorizontal,
  Database,
  BookOpen,
  Truck,
  Wallet,
  UserCircle,
  Landmark,
  Shield,
  LayoutGrid,
  CalendarDays
} from 'lucide-react';
import type { User, AppRole } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services/admin.service';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | typeof Icon;
  path: string;
  isActive?: boolean;
  groupTag: string;
  permissions?: string[]; 
}

const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  // Mi Taller
  { 
    label: 'Nuevo Servicio', 
    path: '/servicios/nuevo', 
    icon: PlusCircle, 
    groupTag: "Mi Taller",
    permissions: ['services:create']
  },
  { 
    label: 'Tablero', 
    path: '/tablero', 
    icon: LayoutGrid, 
    groupTag: "Mi Taller",
    permissions: ['dashboard:view']
  },
  { 
    label: 'Cotizaciones', 
    path: '/cotizaciones/historial', 
    icon: FileText, 
    groupTag: "Mi Taller",
    permissions: ['services:create'] 
  },
  { 
    label: 'Agenda', 
    path: '/servicios/agenda', 
    icon: CalendarDays, 
    groupTag: "Mi Taller",
    permissions: ['services:create']
  },
  { 
    label: 'Servicios', 
    path: '/servicios/historial', 
    icon: History, 
    groupTag: "Mi Taller",
    permissions: ['services:view_history']
  },
  { 
    label: 'Vehículos', 
    path: '/vehiculos', 
    icon: Car, 
    groupTag: "Mi Taller",
    permissions: ['vehicles:manage']
  },
  
  // Operaciones
  {
    label: 'Punto de Venta',
    path: '/pos',
    icon: Receipt,
    groupTag: "Operaciones",
    permissions: ['pos:create_sale', 'pos:view_sales']
  },
  { 
    label: 'Inventario', 
    path: '/inventario', 
    icon: Package, 
    groupTag: "Operaciones", 
    permissions: ['inventory:view'] 
  },
  
  // Mi Flotilla
  {
    label: 'Registar Pago',
    path: '/rentas',
    icon: DollarSign,
    groupTag: "Mi Flotilla",
    permissions: ['fleet:manage']
  },
  {
    label: 'Flotilla',
    path: '/flotilla',
    icon: Truck,
    groupTag: "Mi Flotilla",
    permissions: ['fleet:manage']
  },
  
  // Análisis
  {
    label: 'Finanzas',
    path: '/finanzas/resumen',
    icon: Landmark,
    groupTag: "Análisis",
    permissions: ['finances:view_report']
  },
  {
    label: 'Reportes',
    path: '/finanzas/reporte',
    icon: BarChartHorizontal,
    groupTag: "Análisis",
    permissions: ['finances:view_report']
  },

  // Opciones
  {
    label: 'Personal', 
    path: '/personal', 
    icon: Users, 
    groupTag: "Opciones",
    permissions: ['technicians:manage']
  },
  {
    label: 'Opciones',
    path: '/opciones',
    icon: Settings,
    groupTag: "Opciones",
    permissions: ['dashboard:view'] // All users can see options
  },
  {
    label: 'Administración',
    path: '/administracion',
    icon: Shield,
    groupTag: "Opciones",
    permissions: ['users:manage', 'roles:manage', 'audits:view']
  }
];

const DESIRED_GROUP_ORDER = ["Mi Taller", "Operaciones", "Mi Flotilla", "Análisis", "Opciones"];


const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
        if (typeof window !== "undefined") {
            const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
            if (authUserString) {
                try {
                    setCurrentUser(JSON.parse(authUserString));
                } catch (e) {
                    setCurrentUser(defaultSuperAdmin);
                }
            } else {
                setCurrentUser(defaultSuperAdmin);
            }
            setRoles(await adminService.getRoles());
        }
    };
    loadData();
    
    // Add event listener to re-evaluate on data change
    const handleDbUpdate = () => loadData();
    window.addEventListener('databaseUpdated', handleDbUpdate);
    return () => window.removeEventListener('databaseUpdated', handleDbUpdate);
    
  }, [pathname]);

  const userPermissions = React.useMemo(() => {
    if (!currentUser || !roles.length) {
        // Fallback to superadmin permissions if no user/roles are found
        return new Set(BASE_NAV_STRUCTURE.flatMap(item => item.permissions || []));
    }
    const userRole = roles.find(r => r && r.name === currentUser.role);
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);


  const filteredNavStructure = React.useMemo(() => {
    if (!currentUser) return []; 
    
    return BASE_NAV_STRUCTURE.filter(item => 
      item.permissions?.some(p => userPermissions.has(p))
    );
  }, [currentUser, userPermissions]);

  const entriesWithActiveState = filteredNavStructure.map(entry => {
    let isActive = pathname === entry.path;
    
    // Handle parent route matching for nested pages
    const isParentRoute = pathname.startsWith(`${entry.path}/`);
    if (isParentRoute) {
        const isMoreSpecificActive = filteredNavStructure.some(otherEntry => 
            pathname.startsWith(`${otherEntry.path}/`) && otherEntry.path.length > entry.path.length
        );
        if (!isMoreSpecificActive) {
            isActive = true;
        }
    }
    
    // Specific overrides to group related pages under one active nav item
    if (entry.path === '/servicios/historial' && (pathname.startsWith('/servicios/'))) isActive = true;
    if (entry.path === '/cotizaciones/historial' && pathname.startsWith('/cotizaciones/')) isActive = true;
    if (entry.path === '/vehiculos' && (pathname.startsWith('/vehiculos') || pathname.startsWith('/precios'))) isActive = true;
    if (entry.path === '/pos' && pathname.startsWith('/pos')) isActive = true;
    if (entry.path === '/personal' && (pathname.startsWith('/personal') || pathname.startsWith('/tecnicos') || pathname.startsWith('/administrativos'))) isActive = true;
    if (entry.path === '/opciones' && (pathname.startsWith('/opciones') || pathname.startsWith('/perfil') || pathname.startsWith('/manual') || pathname.startsWith('/admin/configuracion-ticket'))) isActive = true;
    if (entry.path === '/finanzas/resumen' && pathname.startsWith('/finanzas')) isActive = true;
    if (entry.path === '/administracion' && (pathname.startsWith('/administracion') || pathname.startsWith('/admin'))) isActive = true;
    if (entry.path === '/flotilla' && (pathname.startsWith('/flotilla') || pathname.startsWith('/conductores') || pathname.startsWith('/rentas'))) isActive = true;
    if (entry.path === '/rentas' && pathname.startsWith('/rentas')) isActive = true;
    
    // Deactivations for clarity
    if (entry.path === '/servicios/historial' && (pathname.startsWith('/servicios/agenda') || pathname.startsWith('/servicios/nuevo'))) isActive = false;
    if (entry.path === '/finanzas/resumen' && pathname.startsWith('/finanzas/reporte')) isActive = false;
    if (entry.path === '/flotilla' && pathname.startsWith('/rentas')) isActive = false;


    return { ...entry, isActive };
  });
  
  const groupedByTag = entriesWithActiveState.reduce((acc, item) => {
      const tag = item.groupTag;
      if (!acc[tag]) {
        acc[tag] = [];
      }
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

export default useNavigation;
