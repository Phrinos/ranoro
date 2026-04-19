
"use client";

import { usePathname, useRouter } from "next/navigation";
import { withSuspense } from "@/lib/withSuspense";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Settings, LogOut, Wrench, Receipt, Package,
  Users, Truck, PlusCircle, ShoppingCart, Car,
  ListOrdered, BarChart3, FileJson, DollarSign,
  MessageCircle, ChevronDown, Menu, X, CalendarDays,
  HandCoins, TrendingDown, Gauge, FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { User, NavigationEntry } from "@/types";
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { useRoles } from '@/lib/contexts/roles-context';
import { normalizePermissions } from '@/hooks/usePermissions';
import { NotificationBell } from "@/components/layout/NotificationBell";

// ── Nav structure ────────────────────────────────────────────────────

interface NavGroup {
  label: string;
  items: ReadonlyArray<Omit<NavigationEntry, 'isActive'>>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Inicio', path: '/dashboard', icon: BarChart3, permissions: ['services:view'] }
    ]
  },
  {
    label: 'Agenda',
    items: [
      { label: 'Agenda', path: '/agenda', icon: CalendarDays, permissions: ['services:view'] },
    ],
  },
  {
    label: 'Servicios',
    items: [
      { label: 'Nuevo Servicio', path: '/servicios/nuevo', icon: PlusCircle, permissions: ['services:create'] },
      { label: 'Mis Servicios',  path: '/servicios',       icon: Wrench,     permissions: ['services:view'] },
      { label: 'Cotizaciones',   path: '/servicios/cotizaciones', icon: Receipt, permissions: ['services:view'] },
      { label: 'Historial',      path: '/servicios/historial',   icon: Truck, permissions: ['services:view'] },
    ],
  },
  {
    label: 'Vehículos',
    items: [
      { label: 'Ver Vehículos',    path: '/vehiculos',      icon: Car,        permissions: ['vehicles:view', 'vehicles:manage', 'fleet:view'] },
      { label: 'Lista de Precios', path: '/listadeprecios', icon: ListOrdered, permissions: ['inventory:view', 'inventory:create', 'inventory:edit'] },
    ],
  },
  {
    label: 'Punto de Venta',
    items: [
      { label: 'Nueva Venta',       path: '/punto-de-venta/nueva-venta', icon: PlusCircle,   permissions: ['pos:create_sale'] },
      { label: 'Inventario',        path: '/punto-de-venta?tab=inventario', icon: Package,   permissions: ['inventory:view'] },
      { label: 'Ventas',            path: '/punto-de-venta?tab=ventas',   icon: Receipt,     permissions: ['pos:view_sales'] },
      { label: 'Compras',           path: '/punto-de-venta?tab=compras',  icon: ShoppingCart, permissions: ['purchases:view'] },
      { label: 'Proveedores',       path: '/punto-de-venta?tab=proveedores', icon: Truck,   permissions: ['purchases:view'] },
    ],
  },
  {
    label: 'Flotilla',
    items: [
      { label: 'Ver Flotilla',        path: '/flotilla',                         icon: Truck,        permissions: ['fleet:view'] },
      { label: 'Registrar Abono',     path: '/flotilla?action=abono',            icon: HandCoins,    permissions: ['fleet:manage_rentals'] },
      { label: 'Registrar Cargo',     path: '/flotilla?action=cargo',            icon: TrendingDown, permissions: ['fleet:manage_rentals'] },
      { label: 'Registrar Salida',    path: '/flotilla?action=salida',           icon: Gauge,        permissions: ['fleet:manage_rentals'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Corte de Caja',   path: '/administracion?tab=corte',       icon: DollarSign, permissions: ['finances:view'] },
      { label: 'Movimientos',     path: '/administracion?tab=movimientos',  icon: BarChart3,  permissions: ['finances:view'] },
      { label: 'Facturación',     path: '/facturacion',                     icon: FileJson,   permissions: ['billing:manage'] },
      { label: 'Contratos',       path: '/contratos',                       icon: FileText,   permissions: ['admin:settings'] },
      { label: 'Personal',        path: '/personal',                        icon: Users,      permissions: ['admin:manage_users_roles', 'finances:view'] },
    ],
  },
  {
    label: 'Opciones',
    items: [
      { label: 'Configuración',   path: '/opciones',   icon: Settings,      permissions: ['admin:settings'] },
      { label: 'WhatsApp',        path: '/whatsapp',   icon: MessageCircle, permissions: ['messaging:view', 'admin:settings'] },
      { label: 'Usuarios',        path: '/usuarios',   icon: Users,         permissions: ['admin:manage_users_roles'] },
      { label: 'Mantenimiento',   path: '/opciones?tab=mantenimiento', icon: Wrench, permissions: ['admin:settings'] },
    ],
  },
];


// ── Dropdown nav group ────────────────────────────────────────────────

function NavGroupDropdown({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate?: () => void }) {
  const isGroupActive = group.items.some(
    i => pathname === i.path || (i.path !== '/' && pathname.startsWith(i.path!))
  );

  const triggerClass = cn(
    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap select-none",
    isGroupActive
      ? "bg-white/20 text-white"
      : "text-white/70 hover:text-white hover:bg-white/10"
  );

  if (group.items.length === 1) {
    const item = group.items[0];
    const Icon = item.icon as React.ElementType;
    return (
      <Link href={item.path!} onClick={onNavigate} className={triggerClass}>
        <Icon className="h-4 w-4 opacity-80" />
        {group.label}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={triggerClass}>
          {group.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {group.items.map(item => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path!));
          const Icon = item.icon as React.ElementType;
          return (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                href={item.path!}
                onClick={onNavigate}
                className={cn("flex items-center gap-2", isActive && "font-semibold text-primary")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main component ───────────────────────────────────────────────────

function AppTopNavInner({
  currentUser,
  onLogout,
}: {
  currentUser: User | null;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const roles = useRoles();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userPermissions = React.useMemo(() => {
    if (!currentUser) return new Set<string>();
    if (currentUser.role === 'Superadministrador') {
      return new Set(ALL_PERMISSIONS.map(p => p.id));
    }
    const userRole = roles.find(r => r && r.name === currentUser.role);
    return normalizePermissions(userRole?.permissions || []);
  }, [currentUser, roles]);

  // Filter groups / items by permission
  const visibleGroups = React.useMemo(() => {
    if (!currentUser) return [];
    return NAV_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.permissions || item.permissions.length === 0) return true;
        return item.permissions.some(p => userPermissions.has(p));
      }),
    })).filter(g => g.items.length > 0);
  }, [currentUser, userPermissions]);

  const handleLogout = () => {
    onLogout();
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black text-white backdrop-blur-md shadow-sm print:hidden">
        <div className="flex h-14 items-center px-4 md:px-6 gap-4">

        {/* Logo */}
        <div className="flex-1 shrink-0 flex items-center justify-start">
          <Link href="/dashboard" className="relative w-[100px] h-[26px]">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro"
              fill
              style={{ objectFit: 'contain' }}
              sizes="100px"
              className="drop-shadow-sm" 
            />
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center justify-center gap-1 shrink-0 px-4">
          {visibleGroups.map(group => (
            <NavGroupDropdown
              key={group.label}
              group={group}
              pathname={pathname}
            />
          ))}
        </nav>

        {/* Right side: user card & notifications */}
        <div className="flex items-center justify-end gap-2 flex-1 shrink-0 ml-auto">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-1.5 hover:bg-white/10 transition-colors text-sm text-white">
                <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="font-semibold text-xs truncate max-w-[120px]">
                    {currentUser?.name || 'Mi Cuenta'}
                  </span>
                  <span className="text-[10px] text-white/70 uppercase tracking-wide">
                    {currentUser?.role ?? 'Usuario'}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-white/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{currentUser?.name || 'Mi Cuenta'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/personal?tab=perfil">
                  <Users className="mr-2 h-4 w-4" /> Mi Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Salir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger (Sheet trigger) - Note: Trigger is now in the Bottom Nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px] p-0 flex flex-col bg-black text-white border-white/10 [&>button]:text-white focus:[&>button]:ring-white">
              <SheetHeader className="p-4 border-b border-white/10 text-left pt-6">
                <SheetTitle className="text-lg font-bold text-left flex items-start">
                  <div className="relative w-[100px] h-[26px]">
                    <Image
                      src="/ranoro-logo.png"
                      alt="Ranoro"
                      fill
                      style={{ objectFit: 'contain' }}
                      sizes="100px"
                      className="drop-shadow-sm" 
                    />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 pb-24">
                {visibleGroups
                  // Ocultar del menú lateral las opciones que ya están en el Bottom Nav
                  .filter(
                    (g) =>
                      g.label !== "Agenda" &&
                      g.label !== "Servicios" &&
                      g.label !== "Vehículos" &&
                      g.label !== "Punto de Venta" &&
                      g.label !== "Flotilla"
                  )
                  .map((group) => (
                    <div key={group.label} className="mt-2 text-white">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-2 pt-3 pb-1">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const isActive =
                          pathname === item.path ||
                          (item.path !== "/" && pathname.startsWith(item.path!));
                        const Icon = item.icon as React.ElementType;
                        return (
                          <Link
                            key={item.path}
                            href={item.path!}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
                              isActive
                                ? "bg-white/10 text-primary font-semibold"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black text-white backdrop-blur-none border-t pb-safe border-white/10 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-16 px-2">
          {(() => {
            const bottomNavLabels = ["Servicios", "Vehículos", "Punto de Venta", "Flotilla"];
            const bottomGroups = visibleGroups.filter(g => bottomNavLabels.includes(g.label));

            // Map each group to its respective icon
            const groupIcons: Record<string, React.ElementType> = {
              "Servicios": Wrench,
              "Vehículos": Car,
              "Punto de Venta": Package,
              "Flotilla": Truck,
            };

            const renderedGroups = bottomGroups.map(group => {
              const isActive = group.items.some(
                i => pathname === i.path || (i.path !== '/' && pathname.startsWith(i.path!))
              );
              const GroupIcon = groupIcons[group.label] || Wrench;

              // If group has only 1 item, render directly
              if (group.items.length === 1) {
                 const item = group.items[0];
                 const isItemActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path!));
                 return (
                    <Link
                      key={item.path}
                      href={item.path!}
                      className={cn(
                        "flex flex-col items-center justify-center w-[60px] h-[52px] space-y-1 transition-all rounded-xl",
                        isItemActive ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-white/70 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <GroupIcon className={cn("h-5 w-5 transition-transform duration-200", isItemActive && "scale-110")} />
                      <span className={cn("text-[10px] tracking-tight", isItemActive ? "font-bold" : "font-medium")}>
                        {group.label}
                      </span>
                    </Link>
                 );
              }

              // Otherwise render DropdownMenu pointing upwards
              return (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex flex-col items-center justify-center w-[60px] h-[52px] space-y-1 transition-all outline-none focus:outline-none rounded-xl",
                        isActive ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-white/70 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <GroupIcon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
                      <span className={cn("text-[10px] tracking-tight", isActive ? "font-bold" : "font-medium")}>
                        {group.label}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="top" sideOffset={12} className="min-w-[180px] bg-black text-white border-white/20 shadow-2xl mb-1">
                    <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1">{group.label}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {group.items.map(item => {
                      const isItemActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path!));
                      const Icon = item.icon as React.ElementType;
                      return (
                        <DropdownMenuItem key={item.path} asChild className="focus:bg-white/10 cursor-pointer">
                          <Link
                            href={item.path!}
                            className={cn("flex items-center gap-2 px-3 py-2.5", isItemActive && "font-semibold text-primary")}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            });

            return (
              <>
                {renderedGroups}
                {/* Trigger for the rest of the menu items */}
                <button
                  onClick={() => setMobileOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center w-[60px] h-[52px] space-y-1 transition-all outline-none focus:outline-none rounded-xl",
                    mobileOpen ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Menu className={cn("h-5 w-5 transition-transform duration-200", mobileOpen && "scale-110")} />
                  <span className={cn("text-[10px] tracking-tight", mobileOpen ? "font-bold" : "font-medium")}>
                    Más
                  </span>
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}

export const AppTopNav = withSuspense(AppTopNavInner, <div className="h-14 w-full border-b bg-background" />);
export default AppTopNav;
