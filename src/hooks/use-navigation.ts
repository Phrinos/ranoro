// src/hooks/use-navigation.ts
"use client";

import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutDashboard, Wrench, FileText, Receipt, Package, DollarSign, Users, Settings, 
  Truck, LineChart, Shield, PlusCircle, Landmark, LayoutGrid, CalendarDays, 
  MessageSquare, Car, ShoppingCart, FileJson, Building
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
    label: 'Cotizaciones', path: '/cotizaciones/historial', icon: FileText, groupTag: 'Mi Taller',
    permissions: ['services:create'] 
  },
  { 
    label: 'Agenda', path: '/servicios/agenda', icon: CalendarDays, groupTag: 'Mi Taller',
    permissions: ['services:create']
  },
  { 
    label: 'Servicios', path: '/servicios/historial', icon: Wrench, groupTag: 'Mi Taller',
    permissions: ['services:view_history']
  },
  { 
    label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: 'Mi Taller',
    permissions: ['vehicles:manage']
  },
  
  // Operaciones
  {
    label: 'Nueva Venta', path: '/pos/nuevo', icon: ShoppingCart, groupTag: 'Operaciones',
    permissions: ['pos:create_sale']
  },
  {
    label: 'Punto de Venta', path: '/pos', icon: Receipt, groupTag: 'Operaciones',
    permissions: ['pos:create_sale', 'pos:view_sales']
  },
  { 
    label: 'Inventario', path: '/inventario', icon: Package, groupTag: 'Operaciones', 
    permissions: ['inventory:view'] 
  },
  { 
    label: 'Proveedores', path: '/inventario?tab=proveedores', icon: Building, groupTag: 'Operaciones', 
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
    const isParentRoute = pathname.startsWith(`${entry.path.split('?')[0]}/`);
    if (isParentRoute) {
        const isMoreSpecificActive = filteredNavStructure.some(otherEntry => 
            pathname.startsWith(`${otherEntry.path.split('?')[0]}/`) && otherEntry.path.length > entry.path.length
        );
        if (!isMoreSpecificActive) {
            isActive = true;
        }
    }
    
    // Path-specific grouping logic
    if (pathname.startsWith('/servicios/')) isActive = entry.path === '/servicios/historial';
    if (pathname.startsWith('/cotizaciones')) isActive = entry.path === '/cotizaciones/historial';
    if (pathname.startsWith('/vehiculos') || pathname.startsWith('/precios')) isActive = entry.path === '/vehiculos';
    if (pathname.startsWith('/pos')) isActive = entry.path === '/pos';
    if (pathname.startsWith('/personal') || pathname.startsWith('/tecnicos') || pathname.startsWith('/administrativos')) isActive = entry.path === '/personal';
    if (pathname.startsWith('/opciones') || pathname.startsWith('/perfil') || pathname.startsWith('/manual')) isActive = entry.path === '/opciones';
    if (pathname.startsWith('/finanzas') || pathname.startsWith('/facturacion-admin')) isActive = entry.path === '/finanzas';
    if (pathname.startsWith('/administracion') || pathname.startsWith('/admin')) isActive = entry.path === '/administracion';
    
    // Specific deactivations for clarity
    if (entry.path === '/servicios/historial' && (pathname.startsWith('/servicios/agenda') || pathname.startsWith('/servicios/nuevo'))) isActive = false;
    if (entry.path === '/pos' && pathname.startsWith('/pos/nuevo')) isActive = false;
    if (entry.path === '/rentas' && pathname.startsWith('/flotilla')) isActive = false;
    if (entry.path === '/flotilla' && pathname.startsWith('/rentas')) isActive = false;
    
    // Combined flotilla/rentas logic
    if (pathname.startsWith('/flotilla') || pathname.startsWith('/rentas')) {
        isActive = entry.path === '/flotilla';
    }

    // Inventory and Suppliers logic
    if (pathname.startsWith('/inventario')) {
      if (entry.path === '/inventario?tab=proveedores') {
        // This is only active if the tab is explicitly suppliers
        const searchParams = new URLSearchParams(window.location.search);
        isActive = searchParams.get('tab') === 'proveedores';
      } else {
        // The main inventory link is active if no specific tab is selected or a different tab is
        const searchParams = new URLSearchParams(window.location.search);
        isActive = !searchParams.has('tab') || searchParams.get('tab') !== 'proveedores';
      }
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
