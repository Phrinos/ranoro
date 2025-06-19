
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
  Building, // Icon for Suppliers
} from 'lucide-react';

export interface NavigationEntry {
  label: string;
  icon: LucideIcon | Icon;
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
  { label: 'Lista de Servicios', path: '/servicios', icon: Wrench, groupTag: "Servicios" },
  { label: 'Historial de Servicios', path: '/servicios/historial', icon: History, groupTag: "Servicios" },
  { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, groupTag: "Servicios" },
  
  // Inventario Group
  { label: 'Productos', path: '/inventario', icon: Package, groupTag: "Inventario" },
  { label: 'Categorías', path: '/inventario/categorias', icon: Shapes, groupTag: "Inventario" },
  { label: 'Proveedores', path: '/inventario/proveedores', icon: Building, groupTag: "Inventario" },


  // Clientes Group
  { label: 'Vehículos', path: '/vehiculos', icon: Car, groupTag: "Clientes" },

  // Team Group
  { label: 'Técnicos', path: '/tecnicos', icon: UserCog, groupTag: "Team" },
  { label: 'Usuarios', path: '/admin/usuarios', icon: Users, groupTag: "Team" },

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
    
    // More specific active check: if current path starts with entry path AND is not just the entry path itself (unless entry path is '/')
    // and ensure that if there's an exact match for the current pathname, that one takes precedence.
    if (!isActive && entry.path && entry.path !== '/' && entry.path.length > 1 && pathname.startsWith(entry.path + '/')) {
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
