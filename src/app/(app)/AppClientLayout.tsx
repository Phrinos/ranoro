
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PropsWithChildren } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";


const AppSidebar = dynamic(
  () =>
    import("@/components/layout/app-sidebar").then((m) => m.AppSidebar),
  { ssr: false, loading: () => null }
);

function AppClientLayoutInner({ children }: PropsWithChildren) {
  const { currentUser, isLoading, handleLogout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      const next = `${pathname}${search?.toString() ? `?${search.toString()}` : ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, currentUser, router, pathname, search]);


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
