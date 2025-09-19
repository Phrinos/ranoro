// src/app/(app)/layout.tsx
"use client";

import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { User } from "@/types";
import { useRouter } from 'next/navigation';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/ThemeProvider";


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (authUserString) {
      try {
        const user: User = JSON.parse(authUserString);
        setCurrentUser(user);
        setIsLoading(false);
      } catch (e) {
        // Fallback to auth state change if local storage is invalid
        console.error('Failed to parse authUser:', e);
      }
    }
    
    if (!auth || !db) {
        // If Firebase isn't initialized, we can't proceed.
        // This case should ideally not happen if firebaseClient.js is correct.
        setIsLoading(false);
        router.push('/login');
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const unsubscribeDoc = onSnapshot(userDocRef, (userDoc) => {
                 if (userDoc.exists()) {
                    const userData = { id: user.uid, ...userDoc.data() } as User;
                    localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
                    setCurrentUser(userData);
                } else {
                    // This case handles if the user is deleted from Firestore but still has an active auth session
                    signOut(auth); 
                }
                setIsLoading(false);
            });
            return () => unsubscribeDoc();
        } else {
            setCurrentUser(null);
            localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
            router.push('/login');
            setIsLoading(false);
        }
    });
    
    return () => {
        unsubscribeAuth();
    };
  }, [router]);

  const handleLogout = async () => {
      if (!auth) return;
      await signOut(auth);
  };

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
          <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
