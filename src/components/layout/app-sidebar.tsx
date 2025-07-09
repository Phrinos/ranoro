
"use client";

import Link from "next/link";
import React from "react";
import Image from "next/legacy/image";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar, // Import useSidebar hook
} from "@/components/ui/sidebar";
import useNavigation, { type NavigationEntry } from "@/hooks/use-navigation";
import { Button } from "@/components/ui/button";
import {
  UserCircle,
  UserCog,
  Settings,
  LogOut,
  Users,
  ShieldQuestion,
  DatabaseZap,
  Database,
  Bell,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { User, ServiceRecord, AppRole } from "@/types";
import { signOut } from "firebase/auth"; // Firebase
import { auth } from "@/lib/firebaseClient.js"; // Firebase
import { placeholderServiceRecords, placeholderAppRoles } from "@/lib/placeholder-data";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function AppSidebar() {
  const navItems = useNavigation();
  const router = useRouter();
  const { toast } = useToast();
  const { isMobile, setOpenMobile } = useSidebar(); // Get sidebar context

  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [newSignatureServices, setNewSignatureServices] = React.useState<ServiceRecord[]>([]);

  React.useEffect(() => {
    const checkNotifications = () => {
      if (typeof window !== "undefined") {
        const authUserString = localStorage.getItem("authUser");
        if (authUserString) {
          try {
            setCurrentUser(JSON.parse(authUserString));
          } catch (e) {
            console.error("Failed to parse authUser for sidebar:", e);
            setCurrentUser(null);
          }
        }
        
        // Check for new signatures on load
        const unreadServices = placeholderServiceRecords.filter(s => 
          (s.customerSignatureReception && !s.receptionSignatureViewed) ||
          (s.customerSignatureDelivery && !s.deliverySignatureViewed)
        );
        setNewSignatureServices(unreadServices);
        setRoles(placeholderAppRoles);
      }
    };

    checkNotifications(); // Initial check

    window.addEventListener('focus', checkNotifications); // Re-check when window gains focus

    return () => {
      window.removeEventListener('focus', checkNotifications); // Cleanup listener
    };
  }, []);

  const userPermissions = React.useMemo(() => {
    if (!currentUser || !roles.length) return new Set<string>();
    const userRole = roles.find(r => r && r.name === currentUser.role);
    return new Set(userRole?.permissions || []);
  }, [currentUser, roles]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("authUser");
      }
      toast({
        title: "Sesión Cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
      setCurrentUser(null);
      router.push("/login");
    } catch (error) {
       console.error("Logout Error:", error);
       toast({ title: "Error al cerrar sesión", variant: "destructive" });
    }
  };

  const groupedByTag = React.useMemo(() => {
    return navItems.reduce((acc, item) => {
      const tag = item.groupTag;
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(item);
      return acc;
    }, {} as Record<string, NavigationEntry[]>);
  }, [navItems]);

  const sortedGroupEntries = React.useMemo(() => {
    const orderedGroupNames = navItems.reduce((acc, item) => {
      if (!acc.includes(item.groupTag)) {
        acc.push(item.groupTag);
      }
      return acc;
    }, [] as string[]);

    return orderedGroupNames.map((groupName) => [
      groupName,
      groupedByTag[groupName] || [],
    ]);
  }, [groupedByTag, navItems]);

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border h-16 flex items-center justify-center">
        <Link
          href="/dashboard"
          className="flex items-center justify-center text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors h-full"
        >
          <Image
            src="/ranoro-logo.png"
            alt="Ranoro Logo"
            width={120}
            height={30}
            className="dark:invert object-contain"
            data-ai-hint="ranoro logo"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-0">
        {sortedGroupEntries.map(([tag, entriesInGroup]) => (
          <SidebarGroup key={tag as string} className="p-2">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="group-data-[collapsible=icon]:hidden">
                {tag as string}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(entriesInGroup as NavigationEntry[]).map((entry) => (
                  <SidebarMenuItem key={entry.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={entry.isActive}
                      tooltipLabel={entry.label}
                      tooltipClassName="group-data-[collapsible=icon]:block hidden"
                    >
                      <Link href={entry.path} onClick={() => { if(isMobile) setOpenMobile(false) }}>
                        {React.createElement(entry.icon as any)}
                        <span className="group-data-[collapsible=icon]:hidden">
                          {entry.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="mt-auto border-t border-sidebar-border px-6 py-2 flex flex-row items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            >
              <UserCircle className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                {currentUser?.name || "Mi Cuenta"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="mb-1 w-[var(--sidebar-width-icon)] group-data-[state=expanded]:w-[var(--sidebar-width)] sm:w-[var(--sidebar-width-mobile)] md:w-56"
          >
            <DropdownMenuLabel>
              {currentUser?.name || "Mi Cuenta"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(userPermissions.has('users:manage') || userPermissions.has('roles:manage') || userPermissions.has('ticket_config:manage')) && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Administración</DropdownMenuLabel>
                  {userPermissions.has('users:manage') && (
                    <DropdownMenuItem onClick={() => router.push('/admin/usuarios')}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Usuarios</span>
                    </DropdownMenuItem>
                  )}
                  {userPermissions.has('roles:manage') && (
                    <DropdownMenuItem onClick={() => router.push('/admin/roles')}>
                      <ShieldQuestion className="mr-2 h-4 w-4" />
                      <span>Roles y Permisos</span>
                    </DropdownMenuItem>
                  )}
                  {userPermissions.has('users:manage') && (
                    <DropdownMenuItem onClick={() => router.push('/admin/migracion-datos')}>
                      <DatabaseZap className="mr-2 h-4 w-4" />
                      <span>Migración de Datos</span>
                    </DropdownMenuItem>
                  )}
                  {userPermissions.has('ticket_config:manage') && (
                   <DropdownMenuItem onClick={() => router.push('/admin/configuracion-ticket')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurar Ticket</span>
                  </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 text-destructive" />
              <span className="text-destructive">Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="justify-center text-sidebar-foreground relative hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0 w-8 h-8 p-0">
                    <Bell className="h-7 w-7"/>
                    {newSignatureServices.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-1 w-72">
                <DropdownMenuLabel>Notificaciones de Firma</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {newSignatureServices.length > 0 ? (
                    newSignatureServices.map(service => (
                        <DropdownMenuItem key={service.id} onSelect={() => router.push(`/vehiculos/${service.vehicleId}`)}>
                            <div className="flex flex-col">
                                <span className="font-medium">Nueva firma para {service.vehicleIdentifier}</span>
                                <span className="text-xs text-muted-foreground">{service.description}</span>
                                <span className="text-xs text-muted-foreground">{format(parseISO(service.serviceDate), "dd MMM yyyy", { locale: es })}</span>
                            </div>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>No hay firmas nuevas</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
