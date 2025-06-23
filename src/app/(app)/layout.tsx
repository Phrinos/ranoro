
"use client"; // Required for useEffect, useState, and useRouter

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { hydrateFromLocalStorage, persistToLocalStorage } from '@/lib/placeholder-data'; // Import persistence functions

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking, true = yes, false = no

  // This effect handles authentication
  useEffect(() => {
    // This effect runs only on the client, after the initial server render.
    const authUser = localStorage.getItem('authUser');
    if (authUser) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      // Redirect to login only if not already there, to prevent a loop.
      if (pathname !== '/login') { 
        router.replace('/login');
      }
    }
  }, [router, pathname]);

  // This effect handles data persistence
  useEffect(() => {
    // On initial client-side load, hydrate data from localStorage.
    // This needs to run after authentication check to avoid running on login page.
    if (isAuthenticated) {
      hydrateFromLocalStorage();
    }

    // Function to persist data to localStorage
    const handlePersist = () => {
      // We check for `document.hidden` because the event fires on both hide and show
      if (document.visibilityState === 'hidden') {
        persistToLocalStorage();
      }
    };
    
    // Add event listeners for persisting data when tab is hidden or closed.
    document.addEventListener('visibilitychange', handlePersist);
    window.addEventListener('beforeunload', persistToLocalStorage);

    // Cleanup function to remove listeners when the component unmounts.
    return () => {
      document.removeEventListener('visibilitychange', handlePersist);
      window.removeEventListener('beforeunload', persistToLocalStorage);
      
      // Also persist one last time on cleanup, just in case.
      persistToLocalStorage();
    };
  }, [isAuthenticated]); // Rerun this effect if authentication state changes.


  // While checking authentication status, render nothing to avoid a flash of the layout.
  // This state is only `null` on the very first client-side render.
  if (isAuthenticated === null) {
    return null; // Or a full-page loading spinner
  }

  // If not authenticated, the useEffect above will have already triggered a redirect.
  // We return null here to prevent the main layout from rendering and flashing before the redirect happens.
  if (!isAuthenticated) {
    return null;
  }
  
  // If we've confirmed the user is authenticated, render the main app layout.
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
