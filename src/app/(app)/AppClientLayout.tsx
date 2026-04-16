
"use client";
import { withSuspense } from "@/lib/withSuspense";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PropsWithChildren } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";

import { RolesProvider } from "@/lib/contexts/roles-context";

const AppTopNav = dynamic(
  () => import("@/components/layout/app-sidebar").then((m) => m.AppTopNav),
  { ssr: false, loading: () => <div className="h-14 w-full border-b bg-background" /> }
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
    <RolesProvider>
      <ThemeProvider defaultTheme="light" enableSystem={false}>
        <div className="flex min-h-screen flex-col bg-background">
          {/* Top Navigation */}
          <AppTopNav currentUser={currentUser} onLogout={handleLogout} />


          {/* Page content */}
          <main id="content" className="flex-1">
            <div className="p-4 pt-6 md:p-6 lg:p-8">
              {children}
            </div>
          </main>

          <Toaster />
        </div>
      </ThemeProvider>
    </RolesProvider>
  );
}

const AppClientLayout = withSuspense(AppClientLayoutInner, null);
export default AppClientLayout;
