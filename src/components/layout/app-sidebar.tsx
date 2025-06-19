
"use client";

import Link from "next/link";
import React from "react";
// Collapsible and ChevronDown are no longer needed
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
import { UserCircle } from "lucide-react";
// cn is still useful for other classes
// import { cn } from "@/lib/utils"; 

export function AppSidebar() {
  const navItems = useNavigation(); // This now returns a flat list of NavigationEntry

  // Group entries by their groupTag for visual separation
  const groupedByTag = navItems.reduce((acc, item) => {
    const tag = item.groupTag; // groupTag is now mandatory for grouping
    if (!acc[tag]) {
      acc[tag] = [];
    }
    acc[tag].push(item);
    return acc;
  }, {} as Record<string, NavigationEntry[]>);


  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center justify-center text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors h-full">
          <span className="font-headline text-xl group-data-[collapsible=icon]:hidden">Ranoro</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-0">
        {Object.entries(groupedByTag).map(([tag, entriesInGroup]) => (
          <SidebarGroup key={tag} className="p-2">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="group-data-[collapsible=icon]:hidden">{tag}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {entriesInGroup.map((entry) => (
                  <SidebarMenuItem key={entry.path}> {/* Use path as key for unique items */}
                    <SidebarMenuButton
                      asChild
                      isActive={entry.isActive}
                      tooltip={{children: entry.label, className: "group-data-[collapsible=icon]:block hidden"}}
                    >
                      <Link href={entry.path}>
                        <entry.icon />
                         <span className="group-data-[collapsible=icon]:hidden">{entry.label}</span>
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
