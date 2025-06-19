
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
    
    // Check if current path starts with entry path for parent active state,
    // but only if it's not the root and not an exact match for another more specific entry.
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        const isMoreSpecificActiveEntry = BASE_NAV_STRUCTURE.some(
          otherEntry => otherEntry.path === pathname && otherEntry.path.length > entry.path.length
        );
        if (!isMoreSpecificActiveEntry) {
            isActive = true;
        }
    }
    // Special case for /servicios and /servicios/nuevo - /servicios should be active if /servicios/nuevo is active
    // Also make /servicios active if /servicios/historial is active
    if (entry.path === '/servicios' && (pathname.startsWith('/servicios/nuevo') || pathname.startsWith('/servicios/historial'))) {
      isActive = true;
    }


    return { ...entry, isActive };
  });
};

export default useNavigation;
