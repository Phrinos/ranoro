
"use client";

import Link from "next/link";
// import { AppLogo } from "@/components/icons"; // AppLogo removed
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
import useNavigation, { type NavItem } from "@/hooks/use-navigation";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react"; // Changed from LogOut

export function AppSidebar() {
  const navItems = useNavigation();

  const groupedNavItems = navItems.reduce((acc, item) => {
    const groupName = item.group || "Otros";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center justify-center text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors h-full">
          {/* <AppLogo className="h-8 w-8" /> Removed */}
          <span className="font-headline text-xl group-data-[collapsible=icon]:hidden">Ranoro</span>
          {/* When collapsed, this header will be visually empty unless "Ranoro" is styled to show an initial or an icon is added here */}
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-0">
        {Object.entries(groupedNavItems).map(([groupName, items]) => (
          <SidebarGroup key={groupName} className="p-2">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="group-data-[collapsible=icon]:hidden">{groupName}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      tooltip={{children: item.label, className: "group-data-[collapsible=icon]:block hidden"}}
                    >
                      <Link href={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
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
        <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center">
          <UserCircle className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Mi Cuenta</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
