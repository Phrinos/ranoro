// src/hooks/use-navigation.ts
"use client";

import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings, 
  Truck, LineChart, Shield, PlusCircle, Landmark, LayoutGrid, CalendarDays, 
  MessageSquare, Car, ShoppingCart, FileJson, Building, BarChart3, Wallet
} from 'lucide-react';
import type { User, AppRole, NavigationEntry } from '@/types';
import { AUTH_USER_LOCALSTORAGE_KEY, defaultSuperAdmin, placeholderAppRoles } from '@/lib/placeholder-data';
import { adminService } from '@/lib/services';


const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  // Mi Taller
  { 
    label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: 'Mi Taller',
    permissions: ['services:create']
  },
  { 
    label: 'Tablero', path: '/tablero', icon: LayoutGrid, groupTag: 'Mi Taller',
    permissions: ['dashboard:view']
  },
  { 
    label: 'Servicios', path: '/servicios', icon: Wrench, groupTag: 'Mi Taller',
    permissions: ['services:view_history']
  },
  { 
    label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: 'Mi Taller',
    permissions: ['vehicles:manage']
  },
  
  // Operaciones
  {
    label: 'Punto de Venta', path: '/pos', icon: Receipt, groupTag: 'Operaciones',
    permissions: ['pos:view_sales']
  },
  { 
    label: 'Inventario', path: '/inventario', icon: Package, groupTag: 'Operaciones', 
    permissions: ['inventory:view'] 
  },
  { 
    label: 'Proveedores', path: '/proveedores', icon: Building, groupTag: 'Operaciones', 
    permissions: ['inventory:manage'] 
  },
  
  // Mi Flotilla
  {
    label: 'Registrar Pago', path: '/rentas?action=registrar', icon: DollarSign, groupTag: 'Mi Flotilla',
    permissions: ['fleet:manage']
  },
  {
    label: 'Ingresos', path: '/rentas', icon: Landmark, groupTag: 'Mi Flotilla',
    permissions: ['fleet:manage']
  },
  {
    label: 'Flotilla', path: '/flotilla', icon: Truck, groupTag: 'Mi Flotilla',
    permissions: ['fleet:manage']
  },
  
  // Análisis
  {
    label: 'Finanzas', path: '/finanzas', icon: LineChart, groupTag: 'Análisis',
    permissions: ['finances:view_report']
  },
  {
    label: 'Facturación', path: '/facturacion-admin', icon: FileJson, groupTag: 'Análisis',
    permissions: ['finances:view_report'] // Assuming same permission for now
  },

  // Opciones
  {
    label: 'Personal', path: '/personal', icon: Users, groupTag: 'Opciones',
    permissions: ['technicians:manage', 'users:manage', 'roles:manage']
  },
  {
    label: 'Opciones', path: '/opciones', icon: Settings, groupTag: 'Opciones',
    permissions: ['dashboard:view'] // All users can see options
  },
  {
    label: 'Administración', path: '/administracion', icon: Shield, groupTag: 'Opciones',
    permissions: ['audits:view', 'messaging:manage']
  }
];

const DESIRED_GROUP_ORDER = ['Mi Taller', 'Operaciones', 'Mi Flotilla', 'Análisis', 'Opciones'];

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
    if (!currentUser || roles.length === 0) return new Set<string>();
    const userRole = roles.find(r => r && r.name === currentUser.role);
    if (!userRole) {
      console.warn(`Role "${currentUser.role}" not found in fetched roles.`);
      // Fallback to placeholder if roles haven't loaded
      const placeholderRole = placeholderAppRoles.find(r => r.name === currentUser.role);
      return new Set(placeholderRole?.permissions || []);
    }
    return new Set(userRole.permissions || []);
  }, [currentUser, roles]);

  const filteredNavStructure = React.useMemo(() => {
    if (!currentUser) return []; 
    return BASE_NAV_STRUCTURE.filter(item => item.permissions?.some(p => userPermissions.has(p)));
  }, [currentUser, userPermissions]);

  const entriesWithActiveState = filteredNavStructure.map(entry => {
    let isActive = pathname === entry.path.split('?')[0];

    // Special handling for parent routes
    if (pathname.startsWith('/servicios') && entry.path === '/servicios') {
        isActive = !pathname.startsWith('/servicios/nuevo');
    } else if (pathname.startsWith('/vehiculos')) {
        isActive = entry.path === '/vehiculos';
    } else if (pathname.startsWith('/pos')) {
        isActive = !pathname.startsWith('/pos/nuevo');
    } else if (pathname.startsWith('/caja')) {
        isActive = entry.path === '/caja';
    } else if (pathname.startsWith('/personal') || pathname.startsWith('/tecnicos') || pathname.startsWith('/administrativos')) {
        isActive = entry.path === '/personal';
    } else if (pathname.startsWith('/opciones') || pathname.startsWith('/perfil') || pathname.startsWith('/manual')) {
        isActive = entry.path === '/opciones';
    } else if (pathname.startsWith('/finanzas') || pathname.startsWith('/facturacion-admin')) {
        isActive = entry.path === '/finanzas';
    } else if (pathname.startsWith('/administracion') || pathname.startsWith('/admin')) {
        isActive = entry.path === '/administracion';
    } else if (pathname.startsWith('/flotilla') || pathname.startsWith('/rentas')) {
        isActive = entry.path === '/flotilla' || entry.path === '/rentas';
        if (pathname.startsWith('/flotilla') && entry.path === '/rentas') isActive = false;
        if (pathname.startsWith('/rentas') && entry.path === '/flotilla') isActive = false;
    }

    // Specific activation for "Nuevo Servicio"
    if (entry.path === '/servicios/nuevo' && pathname === '/servicios/nuevo') {
      isActive = true;
    }
    
    return { ...entry, isActive };
  });
  
  const groupedByTag = entriesWithActiveState.reduce((acc, item) => {
      const tag = item.groupTag;
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

export default useNavigation;
