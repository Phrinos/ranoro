
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
  BarChart3, 
  Briefcase
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | typeof Icon;
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
  
  // Mi Inventario
  { label: 'Productos', path: '/inventario', icon: Package, groupTag: "Mi Inventario" },
  { label: 'Categorías', path: '/inventario/categorias', icon: Shapes, groupTag: "Mi Inventario" },
  { label: 'Proveedores', path: '/inventario/proveedores', icon: Building, groupTag: "Mi Inventario" },
  
  // Mi Oficina
  {
    label: 'Informe de Ventas', 
    path: '/finanzas/reporte',
    icon: LineChart,
    groupTag: "Mi Oficina"
  },
  {
    label: 'Resumen Financiero', 
    path: '/finanzas/resumen',
    icon: BarChart3, 
    groupTag: "Mi Oficina"
  },
  { 
    label: 'Staff Técnico', 
    path: '/tecnicos', 
    icon: UserCog, 
    groupTag: "Mi Oficina" 
  },
  { 
    label: 'Staff Administrativo', 
    path: '/administrativos', 
    icon: Briefcase, 
    groupTag: "Mi Oficina",
  },
  {
    label: 'Configurar Ticket',
    path: '/admin/configuracion-ticket',
    icon: Settings,
    groupTag: "Mi Oficina",
    adminOnly: true
  },
];

const DESIRED_GROUP_ORDER = ["Mi Taller", "Mi Inventario", "Mi Oficina"];


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
    
    if (entry.path === '/cotizaciones/historial' && pathname.startsWith('/cotizaciones/nuevo')) {
        isActive = true;
    }
    
    if (entry.path === '/servicios/historial' && 
        (pathname.startsWith('/servicios/nuevo'))) {
      isActive = true;
    }
    if (entry.path === '/servicios/agenda' && pathname.startsWith('/servicios/agenda')) {
        isActive = true;
    }
    
    if (entry.path === '/inventario' &&
        (pathname.startsWith('/inventario/categorias') ||
         pathname.startsWith('/inventario/proveedores') ||
         pathname.match(/^\/inventario\/P[0-9]+$/) || 
         pathname.match(/^\/inventario\/[a-zA-Z0-9_-]+$/) && !pathname.includes('categorias') && !pathname.includes('proveedores') 
       )) {
      isActive = true;
    }

     if (entry.path === '/pos' && pathname.startsWith('/pos/nuevo')) {
      isActive = true;
    }
    
    // Ensure "Mi Oficina" items activate the group correctly
    if (entry.groupTag === "Mi Oficina" && pathname.startsWith(entry.path)) {
        isActive = true;
    }
    // Make "Informe de Ventas" active if on "/finanzas/reporte"
     if (entry.path === '/finanzas/reporte' && pathname === '/finanzas/reporte') {
        isActive = true;
    }
    // Make "Resumen Financiero" active if on "/finanzas/resumen"
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
