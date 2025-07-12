
"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
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
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";


export function AppSidebar({
  currentUser,
  newSignatureServices,
  onNotificationsViewed,
  onLogout,
}: {
  currentUser: User | null;
  newSignatureServices: ServiceRecord[];
  onNotificationsViewed: () => void;
  onLogout: () => void;
}) {
  const navItems = useNavigation();
  const router = useRouter();
  const { toast } = useToast();
  const { isMobile, setOpenMobile } = useSidebar(); // Get sidebar context

  const handleLogout = async () => {
    onLogout();
    router.push("/login");
  };

  const handleNotificationOpen = (isOpen: boolean) => {
    if (isOpen && newSignatureServices.length > 0) {
      onNotificationsViewed();
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
            className="dark:invert"
            style={{ width: "120px", height: "auto" }}
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
      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2 flex flex-col gap-1">
        {/* Notification Area */}
        <DropdownMenu onOpenChange={handleNotificationOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2 py-2 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center relative"
                    title="Notificaciones"
                >
                    <Bell className="h-5 w-5" />
                    <div className="group-data-[collapsible=icon]:hidden flex items-center justify-start gap-2">
                        <span className="text-sm font-medium">Notificaciones</span>
                        {newSignatureServices.length > 0 && (
                            <Badge variant="destructive" className="h-5 animate-pulse">
                                {newSignatureServices.length}
                            </Badge>
                        )}
                    </div>
                     {newSignatureServices.length > 0 && (
                        <span className="hidden group-data-[collapsible=icon]:flex absolute top-1 right-1 h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px]">
                            {newSignatureServices.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="mb-1 w-72">
                <DropdownMenuLabel>Notificaciones de Firma</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {newSignatureServices.length > 0 ? (
                    newSignatureServices.map(service => (
                        <DropdownMenuItem key={service.id} onSelect={() => router.push(`/servicios/historial`)}>
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

        {/* User Area */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 py-2 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center"
            >
              <div className="group-data-[collapsible=icon]:hidden flex flex-col items-start">
                  <span className="text-sm font-semibold leading-none">
                      {currentUser?.name || "Mi Cuenta"}
                  </span>
                  <span className="text-xs text-sidebar-foreground/80 leading-none">
                      {currentUser?.role || 'Rol'}
                  </span>
              </div>
              <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center h-8 w-8 rounded-full bg-sidebar-accent">
                 <span className="text-sm font-semibold">
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                 </span>
              </div>
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
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 text-destructive" />
              <span className="text-destructive">Salir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
