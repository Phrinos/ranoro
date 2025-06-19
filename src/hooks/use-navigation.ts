
"use client";

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Car,
  Users as UsersIcon,
  Archive,
  ShoppingCart,
  DatabaseZap,
  List,
  History,
  PlusCircle,
  Shapes,
  UserCog,
  UserPlus,
  LucideIcon,
  UsersRound, // Keep for Clientes as requested
} from 'lucide-react';
import type { Icon } from 'lucide-react';

// Simplified Navigation Entry - no more subItems or collapsible properties
export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
  path: string; 
  isActive?: boolean;
  groupTag: string; // For top-level visual grouping (e.g., "Principal", "Servicios")
}

const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();

  // All items are now top-level, grouped by `groupTag`
  const navStructure: NavigationEntry[] = [
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

  return navStructure.map(entry => {
    // An item is active if its path is an exact match,
    // OR if its path is a base for the current path (e.g., /vehiculos is active for /vehiculos/1)
    // and the current path is not another explicitly defined navigation entry.
    let isActive = pathname === entry.path;
    if (!isActive && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
        // Check if the current pathname is NOT another defined navigation entry.
        // This prevents '/vehiculos' (list) being active if '/vehiculos/OTRA_COSA_DEFINIDA' is the current page.
        const isExplicitSubPath = navStructure.some(e => e.path === pathname && e.path !== entry.path);
        if (!isExplicitSubPath) {
            isActive = true;
        }
    }
    return { ...entry, isActive };
  });
};

export default useNavigation;
