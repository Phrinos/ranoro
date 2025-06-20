
"use client";

import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
  path: string;
  isActive?: boolean;
  groupTag: string;
}

const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  // Principal
  {
    label: 'Panel Principal',
    path: '/dashboard',
    icon: LayoutDashboard,
    groupTag: "Principal"
  },
  // Clientes
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: "Clientes" },
  
  // Servicios
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: "Servicios" },
  { label: 'Agenda', path: '/servicios/agenda', icon: CalendarClock, groupTag: "Servicios" },
  { label: 'Lista de Servicios', path: '/servicios', icon: Wrench, groupTag: "Servicios" },
  { label: 'Historial de Servicios', path: '/servicios/historial', icon: History, groupTag: "Servicios" },

  // Finanzas
  {
    label: 'Nueva Venta',
    path: '/pos/nuevo',
    icon: Receipt,
    groupTag: "Finanzas"
  },
  {
    label: 'Registro de Ventas',
    path: '/pos',
    icon: DollarSign,
    groupTag: "Finanzas"
  },
  {
    label: 'Reporte Financiero',
    path: '/finanzas/reporte',
    icon: LineChart,
    groupTag: "Finanzas"
  },

  // Inventario
  { label: 'Productos', path: '/inventario', icon: Package, groupTag: "Inventario" },
  { label: 'Categorías', path: '/inventario/categorias', icon: Shapes, groupTag: "Inventario" },
  { label: 'Proveedores', path: '/inventario/proveedores', icon: Building, groupTag: "Inventario" },
  
  // Administración
  { label: 'Técnicos', path: '/tecnicos', icon: UserCog, groupTag: "Administración" },
  { label: 'Usuarios', path: '/admin/usuarios', icon: Users, groupTag: "Administración" },
  {
    label: 'Migración de Datos',
    path: '/admin/migracion-datos',
    icon: DatabaseZap,
    groupTag: "Administración"
  },
  {
    label: 'Configurar Ticket',
    path: '/admin/configuracion-ticket',
    icon: Settings,
    groupTag: "Administración"
  },
];

const DESIRED_GROUP_ORDER = ["Principal", "Clientes", "Servicios", "Finanzas", "Inventario", "Administración"];


const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();

  const entriesWithActiveState = BASE_NAV_STRUCTURE.map(entry => {
    let isActive = pathname === entry.path;

    // More specific paths should take precedence for active state
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        const isMoreSpecificActiveEntry = BASE_NAV_STRUCTURE.some(
          otherEntry => otherEntry.path.startsWith(pathname) && otherEntry.path.length > entry.path.length && otherEntry.path !== entry.path
        );
        if (!isMoreSpecificActiveEntry) {
            isActive = true;
        }
    }
    
    // Handle special cases where a parent route should be active
    if (entry.path === '/servicios' &&
        (pathname.startsWith('/servicios/nuevo') ||
         pathname.startsWith('/servicios/historial') ||
         pathname.startsWith('/servicios/agenda'))
       ) {
      isActive = true;
    }
    if (entry.path === '/inventario' &&
        (pathname.startsWith('/inventario/categorias') ||
         pathname.startsWith('/inventario/proveedores') ||
         pathname.match(/^\/inventario\/P[0-9]+$/) 
       )) {
      isActive = true;
    }
     if (entry.path === '/pos' && pathname.startsWith('/pos/nuevo')) {
      isActive = true;
    }
     if (entry.path === '/finanzas/reporte' && pathname === '/finanzas/reporte') {
      isActive = true;
    }


    return { ...entry, isActive };
  });
  
  // Group and sort
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
      acc.push(...groupedByTag[groupName]);
    }
    return acc;
  }, [] as NavigationEntry[]);
  
  return sortedGroupEntries;

};

export default useNavigation;
