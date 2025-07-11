
"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useEffect, useState } from "react";
import { hydrateFromFirestore } from "@/lib/placeholder-data";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const performHydration = async () => {
      try {
        await hydrateFromFirestore();
        setIsHydrated(true);
      } catch (error) {
        console.error("Failed to hydrate from Firestore:", error);
        // Handle error state if necessary, e.g., show an error message
      }
    };

    performHydration();
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Image
                src="/ranoro-logo.png"
                alt="Ranoro Logo"
                width={200}
                height={50}
                className="h-auto dark:invert"
                priority
            />
            <div className="flex items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-3 text-lg text-muted-foreground">Cargando datos del taller...</span>
            </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <SidebarTrigger className="h-10 w-10 shadow-lg bg-black text-white" />
      </div>
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-6 lg:p-8 bg-background">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
