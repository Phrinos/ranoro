

"use client";

import {
  collection,
  onSnapshot,
  doc,
  writeBatch,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { ServiceRecord, User } from "@/types";
import { useRouter } from 'next/navigation';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!auth || !db) {
        setIsLoading(true);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = { id: user.uid, ...userDoc.data() } as User;
                localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
                setCurrentUser(userData);
            } else {
                await signOut(auth);
                localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
                setCurrentUser(null);
                router.push('/login');
            }
        } else {
            setCurrentUser(null);
            localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
            router.push('/login');
        }
        setIsLoading(false);
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
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/ranoro-logo.png"
            alt="Ranoro Logo"
            width={200}
            height={50}
            className="dark:invert"
            style={{width: 'auto', height: 'auto'}}
            priority
            data-ai-hint="ranoro logo"
          />
          <div className="flex items-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-3 text-lg text-muted-foreground">
              Verificando sesión...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
}
