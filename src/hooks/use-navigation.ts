
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
  ShieldQuestion,
  FileText, 
  ClipboardList, 
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
  path: string;
  isActive?: boolean;
  groupTag: string;
  adminOnly?: boolean; 
}

const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  // Mi Taller
  {
    label: 'Panel Principal',
    path: '/dashboard',
    icon: LayoutDashboard,
    groupTag: "Mi Taller"
  },
  { 
    label: 'Vehículos', 
    path: '/vehiculos', 
    icon: Car, 
    groupTag: "Mi Taller" 
  },
  {
    label: 'Cotizaciones', 
    path: '/cotizaciones/historial', 
    icon: FileText, 
    groupTag: "Mi Taller"
  },
  { 
    label: 'Agenda', 
    path: '/servicios/agenda', 
    icon: CalendarClock, 
    groupTag: "Mi Taller" 
  },
  { 
    label: 'Servicios', 
    path: '/servicios/historial', 
    icon: Wrench, 
    groupTag: "Mi Taller" 
  },
  {
    label: 'Punto de Venta', 
    path: '/pos',
    icon: Receipt, 
    groupTag: "Mi Taller"
  },
  
  // Finanzas
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
  { label: 'Técnicos', path: '/tecnicos', icon: UserCog, groupTag: "Administración", adminOnly: true },
  { label: 'Usuarios', path: '/admin/usuarios', icon: Users, groupTag: "Administración", adminOnly: true },
  { label: 'Roles y Permisos', path: '/admin/roles', icon: ShieldQuestion, groupTag: "Administración", adminOnly: true },
  {
    label: 'Migración de Datos',
    path: '/admin/migracion-datos',
    icon: DatabaseZap,
    groupTag: "Administración",
    adminOnly: true
  },
  {
    label: 'Configurar Ticket',
    path: '/admin/configuracion-ticket',
    icon: Settings,
    groupTag: "Administración",
    adminOnly: true
  },
];

const DESIRED_GROUP_ORDER = ["Mi Taller", "Finanzas", "Inventario", "Administración"];


const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();

  const filteredNavStructure = BASE_NAV_STRUCTURE; 

  const entriesWithActiveState = filteredNavStructure.map(entry => {
    let isActive = pathname === entry.path;

    // More specific active check for parent paths
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        // Check if there's a more specific active entry (e.g., a sub-page)
        const isMoreSpecificActiveEntry = filteredNavStructure.some(
          otherEntry => otherEntry.path.startsWith(pathname) && otherEntry.path.length > entry.path.length && otherEntry.path !== entry.path
        );
        if (!isMoreSpecificActiveEntry) {
            // If no more specific entry is active, then this parent path can be considered active
            isActive = true;
        }
    }
    
    // Special handling for /cotizaciones/historial to be active also for /cotizaciones/nuevo
    if (entry.path === '/cotizaciones/historial' && pathname.startsWith('/cotizaciones/nuevo')) {
        isActive = true;
    }
    
    // Special handling for /servicios/historial to be active also for /servicios/nuevo and /servicios/agenda
    // This rule might need adjustment if Agenda has its own top-level item and shouldn't make "Servicios" active
    if (entry.path === '/servicios/historial' && 
        (pathname.startsWith('/servicios/nuevo'))) {
      isActive = true;
    }
    if (entry.path === '/servicios/agenda' && pathname.startsWith('/servicios/agenda')) {
        isActive = true;
    }
    
    // Special handling for /inventario to be active for its sub-pages
    if (entry.path === '/inventario' &&
        (pathname.startsWith('/inventario/categorias') ||
         pathname.startsWith('/inventario/proveedores') ||
         pathname.match(/^\/inventario\/P[0-9]+$/) || // Matches /inventario/P001 etc.
         pathname.match(/^\/inventario\/[a-zA-Z0-9_-]+$/) && !pathname.includes('categorias') && !pathname.includes('proveedores') // Matches detail page
       )) {
      isActive = true;
    }

     // Special handling for /pos to be active for /pos/nuevo
     if (entry.path === '/pos' && pathname.startsWith('/pos/nuevo')) {
      isActive = true;
    }

     // Prevent /admin/usuarios from being active if /admin/roles is active
     if (entry.path === '/admin/usuarios' && pathname.startsWith('/admin/roles')) { 
        isActive = false; 
    }
    // Ensure /admin/roles is active when on its page
    if (entry.path === '/admin/roles' && pathname === '/admin/roles') {
        isActive = true;
    }


    return { ...entry, isActive };
  });
  
  // Group by tag
  const groupedByTag = entriesWithActiveState.reduce((acc, item) => {
      const tag = item.groupTag;
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(item);
      return acc;
    }, {} as Record<string, NavigationEntry[]>);

  // Sort groups by DESIRED_GROUP_ORDER, then sort items within each group by their original order in BASE_NAV_STRUCTURE
  const sortedGroupEntries = DESIRED_GROUP_ORDER.reduce((acc, groupName) => {
    if (groupedByTag[groupName]) {
      // Sort items within the group based on their original index in BASE_NAV_STRUCTURE
      // This preserves the explicit order defined in BASE_NAV_STRUCTURE for items within the same group
      const groupItems = groupedByTag[groupName].sort((a, b) => {
        return BASE_NAV_STRUCTURE.findIndex(nav => nav.path === a.path) - BASE_NAV_STRUCTURE.findIndex(nav => nav.path === b.path);
      });
      acc.push(...groupItems);
    }
    return acc;
  }, [] as NavigationEntry[]);
  
  return sortedGroupEntries;

};

export default useNavigation;
