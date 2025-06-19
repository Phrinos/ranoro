
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings } from "lucide-react";
// import { AppLogo } from "@/components/icons"; // AppLogo removed
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="md:hidden">
         <SidebarTrigger />
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base text-primary">
          {/* <AppLogo className="h-6 w-6" /> Removed */}
          {/* Ranoro text was in sidebar, header shows nothing or page title */}
          {/* If breadcrumbs or page title is desired here, it needs to be added */}
          <span className="font-headline text-xl">Ranoro</span> {/* Added Ranoro text as AppLogo was removed */}
        </Link>
      </div>
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-5 w-5" />
              <span className="sr-only">Abrir menú de usuario</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Cerrar Sesión</DropdownMenuItem> {/* Kept logout here as per standard header UX */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
