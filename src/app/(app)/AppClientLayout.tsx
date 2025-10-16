
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import React from "react";


const AppSidebar = dynamic(
  () =>
    import("@/components/layout/app-sidebar").then((m) => m.AppSidebar),
  { ssr: false, loading: () => null }
);

function AppClientLayoutInner({ children }: PropsWithChildren) {
  const { currentUser, handleLogout } = useAuth();
  const router = useRouter();

  if (!currentUser) {
    // This case should ideally not be hit if the parent server layout handles redirection.
    // However, it's a good fallback.
    return null;
  }

  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <SidebarProvider defaultOpen>
        <AppSidebar currentUser={currentUser} onLogout={handleLogout} />

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
            <div className="p-4 pt-20 md:pt-6 lg:p-8">{children}</div>
          </main>
          <Toaster />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

const AppClientLayout = withSuspense(AppClientLayoutInner, null);
export default AppClientLayout;
