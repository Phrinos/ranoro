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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";
import { signOut } from "firebase/auth"; // Firebase
import { auth } from "@root/lib/firebaseClient.js"; // Firebase

export function AppSidebar() {
  const navItems = useNavigation();
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
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
    }
  }, []);

  const handleLogout = () => {
    signOut(auth).then(() => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authUser");
      }
      toast({
        title: "Sesión Cerrada",
        description: "Has cerrado sesión exitosamente.",
      });
      setCurrentUser(null);
      router.push("/login");
    }).catch((error) => {
       console.error("Logout Error:", error);
       toast({ title: "Error al cerrar sesión", variant: "destructive" });
    });
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
            width={100}
            height={32}
            className="group-data-[collapsible=icon]:hidden dark:invert"
            data-ai-hint="ranoro logo"
            priority
          />
          <Image
            src="/ranoro-logo.png"
            alt="Ranoro Logo Icon"
            width={28}
            height={28}
            className="hidden group-data-[collapsible=icon]:block dark:invert"
            data-ai-hint="ranoro logo icon"
            priority
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
                      <Link href={entry.path}>
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
      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
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
            <DropdownMenuItem onClick={() => router.push("/perfil")}>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            {(currentUser?.role === "Admin" || currentUser?.role === "Superadmin") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Administración</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push("/admin/usuarios")}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Usuarios</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/roles")}>
                  <ShieldQuestion className="mr-2 h-4 w-4" />
                  <span>Roles y Permisos</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/migracion-datos")}>
                  <DatabaseZap className="mr-2 h-4 w-4" />
                  <span>Migración de Datos</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 text-destructive" />
              <span className="text-destructive">Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
