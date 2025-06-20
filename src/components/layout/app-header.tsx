
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings, LogOut } from "lucide-react"; // Added LogOut
import Link from "next/link";
import { useRouter } from "next/navigation"; // Added useRouter
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast"; // Added useToast

export function AppHeader() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authUser');
    }
    toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión exitosamente.' });
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="md:hidden">
         <SidebarTrigger />
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base text-primary">
          <span className="font-headline text-xl">Ranoro</span>
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
            <DropdownMenuItem onClick={() => router.push('/admin/configuracion-ticket')}> {/* Example link */}
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 text-destructive" />
              <span className="text-destructive">Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
