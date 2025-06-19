
"use client";

import Link from "next/link";
import React from "react";
import * as Collapsible from '@radix-ui/react-collapsible';
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
import { UserCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const navStructure = useNavigation();
  const [openCollapsibles, setOpenCollapsibles] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const calculatedOpenStates: Record<string, boolean> = {};
    navStructure.forEach(group => {
      if (group.isCollapsible) {
        calculatedOpenStates[group.label] = !!group.defaultOpen || !!group.isActive;
      }
    });

    setOpenCollapsibles(currentOpenStates => {
      const allKeys = new Set([...Object.keys(currentOpenStates), ...Object.keys(calculatedOpenStates)]);
      let hasChanged = false;
      for (const key of allKeys) {
          if (currentOpenStates[key] !== calculatedOpenStates[key]) {
              hasChanged = true;
              break;
          }
      }

      if (hasChanged) {
        return calculatedOpenStates;
      }
      return currentOpenStates;
    });
  }, [navStructure]);

  const toggleCollapsible = (label: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [label]: !prev[label] }));
  };
  
  // Group entries by their groupTag for visual separation
  const groupedByTag = navStructure.reduce((acc, item) => {
    const tag = item.groupTag || "Otros";
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
        {Object.entries(groupedByTag).map(([tag, entries]) => (
          <SidebarGroup key={tag} className="p-2">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="group-data-[collapsible=icon]:hidden">{tag}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {entries.map((entry) => (
                  <SidebarMenuItem key={entry.label}>
                    {entry.isCollapsible && entry.subItems ? (
                       <Collapsible.Root
                        open={openCollapsibles[entry.label]}
                        onOpenChange={() => toggleCollapsible(entry.label)}
                        className="w-full"
                      >
                        <Collapsible.Trigger asChild>
                          <SidebarMenuButton
                            className="flex justify-between w-full group-data-[collapsible=icon]:justify-center"
                            isActive={entry.isActive}
                            tooltip={{children: entry.label, className: "group-data-[collapsible=icon]:block hidden"}}
                          >
                            <div className="flex items-center gap-2">
                              <entry.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{entry.label}</span>
                            </div>
                            <ChevronDown 
                              className={cn(
                                "h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
                                openCollapsibles[entry.label] && "rotate-180"
                              )} 
                            />
                          </SidebarMenuButton>
                        </Collapsible.Trigger>
                        <Collapsible.Content className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                          {/* Collapsed view for sub-items needs specific handling if desired, or they just disappear */}
                          <div className="group-data-[collapsible=icon]:hidden">
                            <SidebarMenu className="ml-4 mt-1 pl_2 border-l border-sidebar-border/50">
                              {entry.subItems.map((subItem) => (
                                <SidebarMenuItem key={subItem.path || subItem.label}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={subItem.isActive}
                                    size="sm"
                                    tooltip={{children: subItem.label, className: "group-data-[collapsible=icon]:block hidden"}}
                                  >
                                    <Link href={subItem.path || "#"}>
                                      <subItem.icon />
                                      <span>{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              ))}
                            </SidebarMenu>
                          </div>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={entry.isActive}
                        tooltip={{children: entry.label, className: "group-data-[collapsible=icon]:block hidden"}}
                      >
                        <Link href={entry.path || "#"}>
                          <entry.icon />
                           <span className="group-data-[collapsible=icon]:hidden">{entry.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
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
