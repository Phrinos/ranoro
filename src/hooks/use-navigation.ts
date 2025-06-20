
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
  ClipboardList, // For Historial de Cotizaciones
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
  path: string;
  isActive?: boolean;
  groupTag: string;
  adminOnly?: boolean; // For conditional rendering based on role later
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
    label: 'Nueva Cotización', 
    path: '/cotizaciones/nuevo', // Path updated
    icon: FileText,
    groupTag: "Principal"
  },
  {
    label: 'Historial de Cotizaciones', // New Item
    path: '/cotizaciones/historial',
    icon: ClipboardList, // Using ClipboardList for quote history
    groupTag: "Principal"
  },
  
  // Servicios - Reordered
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: "Servicios" },
  { label: 'Historial de Servicios', path: '/servicios/historial', icon: History, groupTag: "Servicios" },
  { label: 'Agenda', path: '/servicios/agenda', icon: CalendarClock, groupTag: "Servicios" },
  { label: 'Lista de Servicios', path: '/servicios', icon: Wrench, groupTag: "Servicios" },


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

  // In a real app, you'd get the user's role here to filter adminOnly links
  // const currentUserRole = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('authUser') || '{}').role : null;
  // const filteredNavStructure = BASE_NAV_STRUCTURE.filter(entry => 
  //   !entry.adminOnly || (currentUserRole === 'admin' || currentUserRole === 'superadmin')
  // );
  const filteredNavStructure = BASE_NAV_STRUCTURE; // For now, show all

  const entriesWithActiveState = filteredNavStructure.map(entry => {
    let isActive = pathname === entry.path;

    // Make parent active if a child route is active, but not if a more specific nav entry exists
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        const isMoreSpecificActiveEntry = filteredNavStructure.some(
          otherEntry => otherEntry.path.startsWith(pathname) && otherEntry.path.length > entry.path.length && otherEntry.path !== entry.path
        );
        if (!isMoreSpecificActiveEntry) {
            isActive = true;
        }
    }
    
    // Specific overrides for parent active states based on child routes
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
    if (entry.path === '/admin/usuarios' && pathname.startsWith('/admin/roles')) { // Make Usuarios active if on Roles
        isActive = false; // Ensure only one is active
    }
    if (entry.path === '/admin/roles' && pathname === '/admin/roles') {
        isActive = true;
    }
    // For "Nueva Cotización" make it active if path is /cotizaciones/nuevo
    if (entry.path === '/cotizaciones/nuevo' && pathname.startsWith('/cotizaciones/nuevo')) {
        isActive = true;
    }
    // For "Historial de Cotizaciones" make it active if path is /cotizaciones/historial
    if (entry.path === '/cotizaciones/historial' && pathname.startsWith('/cotizaciones/historial')) {
        isActive = true;
    }
    // If on /cotizaciones (which redirects to /nuevo), also make "Nueva Cotización" active
    if (entry.path === '/cotizaciones/nuevo' && pathname === '/cotizaciones') {
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
      acc.push(...groupedByTag[groupName]);
    }
    return acc;
  }, [] as NavigationEntry[]);
  
  return sortedGroupEntries;

};

export default useNavigation;

