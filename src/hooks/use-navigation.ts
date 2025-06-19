
"use client";

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Car,
  Users as UsersIcon, // Renamed to avoid conflict
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
  ChevronDown,
  UsersRound,
} from 'lucide-react';
import type { Icon } from 'lucide-react';

export interface NavSubItem {
  label: string;
  path: string;
  icon: LucideIcon | Icon;
  isActive?: boolean;
  disabled?: boolean;
  external?: boolean;
}

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
  path?: string; // For direct links
  isCollapsible?: boolean; // True if this group is a collapsible submenu
  defaultOpen?: boolean; // If collapsible, should it be open by default?
  subItems?: NavSubItem[]; // For collapsible groups
  isActive?: boolean; // Group itself is active if one of its children is
  groupTag?: string; // For top-level visual grouping in the sidebar (e.g., "Principal", "Gestión")
}


const useNavigation = (): NavigationEntry[] => {
  const pathname = usePathname();

  const structure: NavigationEntry[] = [
    {
      label: 'Panel Principal',
      path: '/dashboard',
      icon: LayoutDashboard,
      groupTag: "Principal"
    },
    {
      label: 'Servicios',
      icon: Wrench,
      isCollapsible: true,
      defaultOpen: pathname.startsWith('/servicios'),
      groupTag: "Gestión",
      subItems: [
        { label: 'Lista de Servicios', path: '/servicios', icon: List },
        { label: 'Historial de Servicios', path: '/servicios/historial', icon: History },
        { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle },
      ]
    },
    {
      label: 'Inventario',
      icon: Archive,
      isCollapsible: true,
      defaultOpen: pathname.startsWith('/inventario'),
      groupTag: "Gestión",
      subItems: [
        { label: 'Lista de Inventario', path: '/inventario', icon: List },
        { label: 'Categorías', path: '/inventario/categorias', icon: Shapes },
      ]
    },
    {
      label: 'Clientes',
      icon: UsersRound, // Using UsersRound for Clientes group
      isCollapsible: true,
      defaultOpen: pathname.startsWith('/vehiculos'),
      groupTag: "Gestión",
      subItems: [
        { label: 'Vehículos', path: '/vehiculos', icon: Car },
      ]
    },
    {
      label: 'Team',
      icon: UsersIcon, // Using UsersIcon for Team group
      isCollapsible: true,
      defaultOpen: pathname.startsWith('/tecnicos') || pathname.startsWith('/admin/usuarios'),
      groupTag: "Gestión",
      subItems: [
        { label: 'Técnicos', path: '/tecnicos', icon: UserCog },
        { label: 'Usuarios', path: '/admin/usuarios', icon: UserPlus },
      ]
    },
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

  return structure.map(entry => {
    let entryIsActive = false;
    if (entry.path) {
      // Exact match for top-level direct links unless it's a base path for details
      const isDetailPage = (entry.path === '/vehiculos' && pathname.startsWith('/vehiculos/')) ||
                           (entry.path === '/tecnicos' && pathname.startsWith('/tecnicos/')) ||
                           (entry.path === '/inventario' && pathname.startsWith('/inventario/'));
      if (isDetailPage) {
        entryIsActive = false; // Parent link itself is not active if a detail page is active
      } else {
        entryIsActive = pathname === entry.path || (entry.path !== '/' && pathname.startsWith(entry.path));
      }
    }

    if (entry.subItems) {
      let subItemIsActive = false;
      entry.subItems = entry.subItems.map(subItem => {
        // More specific active check for sub-items
        const isActive = pathname === subItem.path || (subItem.path !== '/' && pathname.startsWith(subItem.path));
        if (isActive) subItemIsActive = true;
        return { ...subItem, isActive };
      });
      if (subItemIsActive) entryIsActive = true; // Group is active if any sub-item is active
    }
    return { ...entry, isActive: entryIsActive };
  });
};

export default useNavigation;
