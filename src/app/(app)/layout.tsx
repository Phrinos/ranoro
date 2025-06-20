
"use client"; // Required for useEffect and useRouter

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUser = localStorage.getItem('authUser');
      if (!authUser && pathname !== '/login') { // Avoid redirect loop if already on login
        router.replace('/login');
      }
    }
  }, [router, pathname]);

  // Prevent rendering children if redirecting (optional, but can avoid flash of content)
  if (typeof window !== 'undefined' && !localStorage.getItem('authUser') && pathname !== '/login') {
    return null; 
  }
  
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
