
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
  Filter,
  Settings,
  Building, 
  CalendarClock,
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
  path: string;
  isActive?: boolean;
  groupTag: string;
}

const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  {
    label: 'Panel Principal',
    path: '/dashboard',
    icon: LayoutDashboard,
    groupTag: "Principal"
  },
  // Servicios Group
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: "Servicios" },
  { label: 'Agenda', path: '/servicios/agenda', icon: CalendarClock, groupTag: "Servicios" },
  { label: 'Lista de Servicios', path: '/servicios', icon: Wrench, groupTag: "Servicios" },
  { label: 'Historial de Servicios', path: '/servicios/historial', icon: History, groupTag: "Servicios" },
  
  // Inventario Group
  { label: 'Productos', path: '/inventario', icon: Package, groupTag: "Inventario" },
  { label: 'Categorías', path: '/inventario/categorias', icon: Shapes, groupTag: "Inventario" },
  { label: 'Proveedores', path: '/inventario/proveedores', icon: Building, groupTag: "Inventario" },


  // Clientes Group
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: "Clientes" },

  // Team Group
  { label: 'Técnicos', path: '/tecnicos', icon: UserCog, groupTag: "Team" },
  { label: 'Usuarios', path: '/admin/usuarios', icon: Users, groupTag: "Team" }, // Placeholder, page not created

  // Other operational items
  {
    label: 'Punto de Venta',
    path: '/pos',
    icon: ShoppingCart,
    groupTag: "Operaciones"
  },
  {
    label: 'Migración de Datos',
    path: '/admin/migracion-datos',
    icon: DatabaseZap,
    groupTag: "Administración"
  },
];

const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();

  return BASE_NAV_STRUCTURE.map(entry => {
    let isActive = pathname === entry.path;
    
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        const isMoreSpecificActiveEntry = BASE_NAV_STRUCTURE.some(
          otherEntry => otherEntry.path.startsWith(pathname) && otherEntry.path.length > entry.path.length && otherEntry.path !== entry.path
        );
        if (!isMoreSpecificActiveEntry) {
            isActive = true;
        }
    }
    
    if (entry.path === '/servicios' && 
        (pathname === '/servicios/nuevo' || 
         pathname === '/servicios/historial' || 
         pathname === '/servicios/agenda')
       ) {
      isActive = true;
    }


    return { ...entry, isActive };
  });
};

export default useNavigation;
