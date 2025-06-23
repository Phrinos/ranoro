
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
  Database
} from 'lucide-react';
import type { User, AppRole } from '@/types';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | typeof Icon;
  path: string;
  isActive?: boolean;
  groupTag: string;
  permissions?: string[]; 
}

const ROLES_LOCALSTORAGE_KEY = 'appRoles';
const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

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
    label: 'Punto de Venta', 
    path: '/pos',
    icon: Receipt, 
    groupTag: "Mi Taller",
    permissions: ['pos:create_sale']
  },
  
  // Mi Inventario
  { label: 'Productos', path: '/inventario', icon: Package, groupTag: "Mi Inventario", permissions: ['inventory:view'] },
  { label: 'Análisis IA', path: '/inventario/analisis', icon: BarChartHorizontal, groupTag: "Mi Inventario", permissions: ['inventory:manage'] },
  { label: 'Categorías', path: '/inventario/categorias', icon: Shapes, groupTag: "Mi Inventario", permissions: ['inventory:manage'] },
  { label: 'Proveedores', path: '/inventario/proveedores', icon: Building, groupTag: "Mi Inventario", permissions: ['inventory:manage'] },
  
  // Mi Oficina
  {
    label: 'Informe de Ventas', 
    path: '/finanzas/reporte',
    icon: LineChart,
    groupTag: "Mi Oficina",
    permissions: ['finances:view_report']
  },
  {
    label: 'Resumen Financiero', 
    path: '/finanzas/resumen',
    icon: BarChart3, 
    groupTag: "Mi Oficina",
    permissions: ['finances:view_report']
  },
  { 
    label: 'Staff Técnico', 
    path: '/tecnicos', 
    icon: UserCog, 
    groupTag: "Mi Oficina",
    permissions: ['technicians:manage']
  },
  { 
    label: 'Staff Administrativo', 
    path: '/administrativos', 
    icon: Briefcase, 
    groupTag: "Mi Oficina",
    permissions: ['technicians:manage'] // Reusing technician permission for all staff
  },
  {
    label: 'Configurar Ticket',
    path: '/admin/configuracion-ticket',
    icon: Settings,
    groupTag: "Mi Oficina",
    permissions: ['ticket_config:manage']
  },
];

const ALL_AVAILABLE_PERMISSIONS = [
    { id: 'dashboard:view', label: 'Ver Panel Principal' },
    { id: 'services:create', label: 'Crear Servicios' },
    { id: 'services:edit', label: 'Editar Servicios' },
    { id: 'services:view_history', label: 'Ver Historial de Servicios' },
    { id: 'inventory:manage', label: 'Gestionar Inventario (Productos, Cat, Prov)' },
    { id: 'inventory:view', label: 'Ver Inventario' },
    { id: 'pos:create_sale', label: 'Registrar Ventas (POS)' },
    { id: 'pos:view_sales', label: 'Ver Registro de Ventas' },
    { id: 'finances:view_report', label: 'Ver Reporte Financiero' },
    { id: 'technicians:manage', label: 'Gestionar Técnicos' },
    { id: 'vehicles:manage', label: 'Gestionar Vehículos' },
    { id: 'users:manage', label: 'Gestionar Usuarios (Admin)' },
    { id: 'roles:manage', label: 'Gestionar Roles y Permisos (Admin)' },
    { id: 'ticket_config:manage', label: 'Configurar Ticket (Admin)' },
    { id: 'backup:manage', label: 'Gestionar Respaldos (Admin)' },
];

const DESIRED_GROUP_ORDER = ["Mi Taller", "Mi Inventario", "Mi Oficina"];


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
        }
      }

      let loadedRoles: AppRole[] = [];
      const rolesString = localStorage.getItem(ROLES_LOCALSTORAGE_KEY);
      if (rolesString) {
        try {
            loadedRoles = JSON.parse(rolesString);
        } catch (e) {
            console.error("Failed to parse roles:", e);
        }
      }
      
      if (loadedRoles.length === 0) {
        const adminPermissions = ALL_AVAILABLE_PERMISSIONS
            .filter(p => !['users:manage', 'roles:manage'].includes(p.id))
            .map(p => p.id);
        
        const defaultRoles: AppRole[] = [
            { id: 'role_superadmin_default', name: 'Superadmin', permissions: ALL_AVAILABLE_PERMISSIONS.map(p => p.id) },
            { id: 'role_admin_default', name: 'Admin', permissions: adminPermissions },
            { id: 'role_tecnico_default', name: 'Tecnico', permissions: ['dashboard:view', 'services:create', 'services:edit', 'services:view_history', 'inventory:view', 'vehicles:manage', 'pos:view_sales'] },
            { id: 'role_ventas_default', name: 'Ventas', permissions: ['dashboard:view', 'pos:create_sale', 'pos:view_sales', 'inventory:view', 'vehicles:manage'] }
        ];
        localStorage.setItem(ROLES_LOCALSTORAGE_KEY, JSON.stringify(defaultRoles));
        loadedRoles = defaultRoles;
      }
      setRoles(loadedRoles);
    }
  }, []);

  const userPermissions = React.useMemo(() => {
    if (!currentUser || !roles.length) return new Set<string>();
    const userRole = roles.find(r => r.name === currentUser.role);
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
    
    if (entry.path === '/cotizaciones/historial' && pathname.startsWith('/cotizaciones/nuevo')) {
        isActive = true;
    }
    
    if (entry.path === '/servicios/historial' && (pathname.startsWith('/servicios/nuevo'))) {
      isActive = true;
    }
    if (entry.path === '/servicios/agenda' && pathname.startsWith('/servicios/agenda')) {
        isActive = true;
    }
    
    if (entry.path === '/inventario' &&
        (pathname.startsWith('/inventario/categorias') ||
         pathname.startsWith('/inventario/proveedores') ||
         pathname.startsWith('/inventario/analisis') ||
         pathname.match(/^\/inventario\/P[0-9]+$/) || 
         pathname.match(/^\/inventario\/[a-zA-Z0-9_-]+$/) && !pathname.includes('categorias') && !pathname.includes('proveedores') && !pathname.includes('analisis') 
       )) {
      isActive = true;
    }

     if (entry.path === '/pos' && pathname.startsWith('/pos/nuevo')) {
      isActive = true;
    }
    
    if (entry.groupTag === "Mi Oficina" && pathname.startsWith(entry.path)) {
        isActive = true;
    }
     if (entry.path === '/finanzas/reporte' && pathname === '/finanzas/reporte') {
        isActive = true;
    }
    if (entry.path === '/finanzas/resumen' && pathname === '/finanzas/resumen') {
        isActive = true;
    }


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
