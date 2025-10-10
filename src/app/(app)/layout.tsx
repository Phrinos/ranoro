
// src/app/(app)/layout.tsx
"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, handleLogout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // Redirige si no hay sesión (evita loader infinito)
  useEffect(() => {
    if (!isLoading && !currentUser) {
      const next = `${pathname}${search?.toString() ? `?${search.toString()}` : ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, currentUser, router, pathname, search]);

  // Loader solo mientras verificamos sesión o mientras redirigimos
  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-3 text-lg text-muted-foreground">
            Verificando sesión...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <SidebarProvider defaultOpen>
        <AppSidebar currentUser={currentUser} onLogout={handleLogout} />

        {/* Botón para abrir el sidebar en móvil */}
        <div className="fixed top-4 left-4 z-50 md:hidden print:hidden">
          <SidebarTrigger
            aria-label="Abrir menú"
            className="h-10 w-10 shadow-lg bg-black text-white"
          />
        </div>

        <SidebarInset
          className={cn(
            "app-main-content",
            "flex min-h-screen flex-col bg-background"
          )}
        >
          <main id="content" className="flex-1">
            {/* En móvil dejamos más top padding por el trigger fijo */}
            <div className="p-4 pt-20 md:pt-6 lg:p-8">{children}</div>
          </main>

          <Toaster />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
