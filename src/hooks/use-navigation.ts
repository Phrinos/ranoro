"use client";

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Car,
  Users,
  Archive,
  ShoppingCart,
  DatabaseZap,
  LucideIcon,
} from 'lucide-react';
import type { Icon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon | Icon;
  isActive?: boolean;
  disabled?: boolean;
  external?: boolean;
  group?: string;
}

const useNavigation = () => {
  const pathname = usePathname();

  const navigationItems: NavItem[] = [
    {
      label: 'Panel Principal',
      path: '/dashboard',
      icon: LayoutDashboard,
      group: "Principal"
    },
    {
      label: 'Servicios',
      path: '/servicios',
      icon: Wrench,
      group: "Gestión"
    },
    {
      label: 'Vehículos',
      path: '/vehiculos',
      icon: Car,
      group: "Gestión"
    },
    {
      label: 'Técnicos',
      path: '/tecnicos',
      icon: Users,
      group: "Gestión"
    },
    {
      label: 'Inventario',
      path: '/inventario',
      icon: Archive,
      group: "Gestión"
    },
    {
      label: 'Punto de Venta',
      path: '/pos',
      icon: ShoppingCart,
      group: "Operaciones"
    },
    {
      label: 'Migración de Datos',
      path: '/admin/migracion-datos',
      icon: DatabaseZap,
      group: "Administración"
    },
  ];

  return navigationItems.map(item => ({
    ...item,
    isActive: pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)),
  }));
};

export default useNavigation;
