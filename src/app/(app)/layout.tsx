
// src/app/(app)/layout.tsx
"use client";

import { SidebarProvider } from "@/hooks/use-sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth"; // Importar el nuevo hook
import { Toaster } from "@/components/ui/toaster"; // Importar el Toaster

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, handleLogout } = useAuth();

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
      <SidebarProvider defaultOpen={true}>
        <AppSidebar 
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <div className="fixed top-4 left-4 z-50 md:hidden print:hidden">
          <SidebarTrigger className="h-10 w-10 shadow-lg bg-black text-white" />
        </div>
        <SidebarInset className={cn("flex flex-col", "app-main-content")}>
          <main className="flex-1 bg-background">
            <div className="p-4 pt-20 md:pt-6 lg:p-8">
              {children}
            </div>
          </main>
          <Toaster />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
