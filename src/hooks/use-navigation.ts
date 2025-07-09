
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
  Shield
} from 'lucide-react';
import type { User, AppRole } from '@/types';
import { placeholderAppRoles, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

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
    label: 'Panel Principal',
    path: '/dashboard',
    icon: LayoutDashboard,
    groupTag: "Mi Taller",
    permissions: ['dashboard:view']
  },
  { 
    label: 'Vehículos', 
    path: '/vehiculos', 
    icon: Car, 
    groupTag: "Mi Taller",
    permissions: ['vehicles:manage']
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
    icon: CalendarClock, 
    groupTag: "Mi Taller",
    permissions: ['services:view_history']
  },
  { 
    label: 'Servicios', 
    path: '/servicios/historial', 
    icon: Wrench, 
    groupTag: "Mi Taller",
    permissions: ['services:view_history']
  },
  {
    label: 'Lista de Precios',
    path: '/precios',
    icon: Database,
    groupTag: "Mi Taller",
    permissions: ['services:edit']
  },
  
  // Operaciones
  {
    label: 'Nueva Venta',
    path: '/pos/nuevo',
    icon: PlusCircle,
    groupTag: "Operaciones",
    permissions: ['pos:create_sale']
  },
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
    permissions: ['users:manage', 'roles:manage']
  }
];

const DESIRED_GROUP_ORDER = ["Mi Taller", "Operaciones", "Mi Flotilla", "Análisis", "Opciones"];


const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) {
        try {
            setCurrentUser(JSON.parse(authUserString));
        } catch (e) {
            console.error("Failed to parse authUser:", e);
            setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setRoles(placeholderAppRoles);
    }
  }, [pathname]);

  const userPermissions = React.useMemo(() => {
    if (!currentUser || !roles.length) return new Set<string>();
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

    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        const isMoreSpecificActiveEntry = filteredNavStructure.some(
          otherEntry => otherEntry.path.startsWith(pathname) && otherEntry.path.length > entry.path.length && otherEntry.path !== entry.path
        );
        if (!isMoreSpecificActiveEntry) {
            isActive = true;
        }
    }
    
    // Explicit overrides for parent routes
    if (entry.path === '/cotizaciones/historial' && pathname.startsWith('/cotizaciones')) isActive = true;
    if (entry.path === '/servicios/historial' && pathname.startsWith('/servicios')) isActive = true;
    if (entry.path === '/servicios/agenda' && pathname.startsWith('/servicios')) isActive = true;
    if (entry.path === '/inventario' && pathname.startsWith('/inventario')) isActive = true;
    if (entry.path === '/pos' && pathname.startsWith('/pos')) isActive = true;
    if (entry.path === '/personal' && (pathname.startsWith('/personal') || pathname.startsWith('/tecnicos') || pathname.startsWith('/administrativos'))) isActive = true;
    if (entry.path === '/opciones' && (pathname.startsWith('/opciones') || pathname.startsWith('/perfil') || pathname.startsWith('/manual'))) isActive = true;
    if (entry.path === '/finanzas/resumen' && pathname.startsWith('/finanzas')) isActive = true;
    if (entry.path === '/finanzas/reporte' && pathname.startsWith('/finanzas')) isActive = true;
    if (entry.path === '/administracion' && pathname.startsWith('/administracion')) isActive = true;
    
    // Other specific cases
    if (entry.path === '/precios' && pathname === '/precios') isActive = true;
    if (entry.path === '/flotilla' && (pathname.startsWith('/flotilla') || pathname.startsWith('/conductores') || pathname.startsWith('/rentas'))) isActive = true;

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
