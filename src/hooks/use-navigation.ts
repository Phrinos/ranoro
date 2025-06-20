
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
  // Principal
  {
    label: 'Panel Principal',
    path: '/dashboard',
    icon: LayoutDashboard,
    groupTag: "Principal"
  },
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: "Principal" },
  {
    label: 'Cotizaciones', 
    path: '/cotizaciones/historial', 
    icon: FileText, 
    groupTag: "Principal"
  },
  
  // Servicios
  { label: 'Agenda', path: '/servicios/agenda', icon: CalendarClock, groupTag: "Servicios" },
  { label: 'Servicios', path: '/servicios/historial', icon: Wrench, groupTag: "Servicios" },


  // Finanzas
  {
    label: 'Punto de Venta', 
    path: '/pos',
    icon: Receipt, 
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

const DESIRED_GROUP_ORDER = ["Principal", "Servicios", "Finanzas", "Inventario", "Administración"];


const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();

  const filteredNavStructure = BASE_NAV_STRUCTURE; 

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
    
    // Specific handling for "Cotizaciones" (covers /historial and /nuevo)
    if (entry.path === '/cotizaciones/historial' && (pathname === '/cotizaciones/historial' || pathname.startsWith('/cotizaciones/nuevo'))) {
        isActive = true;
    }
    
    // Specific handling for "Servicios" (covers /historial, /nuevo, /agenda)
    if (entry.path === '/servicios/historial' && 
        (pathname === '/servicios/historial' || 
         pathname.startsWith('/servicios/nuevo') || 
         pathname.startsWith('/servicios/agenda'))) {
      isActive = true;
    }
    
    // Specific handling for "Inventario" parent item
    if (entry.path === '/inventario' &&
        (pathname.startsWith('/inventario/categorias') ||
         pathname.startsWith('/inventario/proveedores') ||
         pathname.match(/^\/inventario\/P[0-9]+$/) || // For item detail pages like /inventario/P001
         pathname.match(/^\/inventario\/[a-zA-Z0-9_-]+$/) && !pathname.includes('categorias') && !pathname.includes('proveedores') // General detail page
       )) {
      isActive = true;
    }

    // Specific handling for "Punto de Venta" (covers /pos and /pos/nuevo)
     if (entry.path === '/pos' && (pathname === '/pos' || pathname.startsWith('/pos/nuevo'))) {
      isActive = true;
    }

    // Specific handling for admin section parent items
     if (entry.path === '/admin/usuarios' && pathname.startsWith('/admin/roles')) { 
        isActive = false; 
    }
    if (entry.path === '/admin/roles' && pathname === '/admin/roles') {
        isActive = true;
    }
    // Ensure "Servicios" (the group, if we had one) isn't active if "Agenda" is the more specific one,
    // but our "Servicios" item points to /servicios/historial, so the above logic handles it.

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
      // Sort items within the group according to their order in BASE_NAV_STRUCTURE
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

