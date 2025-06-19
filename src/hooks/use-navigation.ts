
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
  UserPlus,
  ShoppingCart,
  DatabaseZap,
  LucideIcon,
  type Icon, // Keep type Icon if used directly
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon; // LucideIcon is more specific for Lucide components
  path: string;
  isActive?: boolean;
  groupTag: string;
}

// Define the base structure outside the hook for stability
const BASE_NAV_STRUCTURE: ReadonlyArray<Omit<NavigationEntry, 'isActive'>> = [
  {
    label: 'Panel Principal',
    path: '/dashboard',
    icon: LayoutDashboard,
    groupTag: "Principal"
  },
  // Servicios Group
  { label: 'Lista de Servicios', path: '/servicios', icon: List, groupTag: "Servicios" },
  { label: 'Historial de Servicios', path: '/servicios/historial', icon: History, groupTag: "Servicios" },
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: "Servicios" },
  
  // Inventario Group
  { label: 'Lista de Inventario', path: '/inventario', icon: List, groupTag: "Inventario" },
  { label: 'Categorías', path: '/inventario/categorias', icon: Shapes, groupTag: "Inventario" },

  // Clientes Group
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: "Clientes" },

  // Team Group
  { label: 'Técnicos', path: '/tecnicos', icon: UserCog, groupTag: "Team" },
  { label: 'Usuarios', path: '/admin/usuarios', icon: UserPlus, groupTag: "Team" },

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
    // Check if the current path starts with the entry's path, for detail pages.
    // Ensure entry.path is not just '/' to avoid overly broad matches.
    // Also ensure the entry.path has a meaningful length.
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        // Check if the current pathname is NOT another explicitly defined navigation entry
        // that is more specific. This prevents '/vehiculos' (list) being active if '/vehiculos/nuevo' 
        // (if it were a separate nav entry) is the current page.
        const isMoreSpecificActiveEntry = BASE_NAV_STRUCTURE.some(
          otherEntry => otherEntry.path === pathname && otherEntry.path.length > entry.path.length
        );
        if (!isMoreSpecificActiveEntry) {
            isActive = true;
        }
    }
    return { ...entry, isActive };
  });
};

export default useNavigation;
