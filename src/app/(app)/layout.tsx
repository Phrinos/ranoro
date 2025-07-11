
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newSignatureServices, setNewSignatureServices] = useState<ServiceRecord[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!auth || !db) {
        // Firebase no está listo, podría ser un render del lado del servidor inicial
        setIsLoading(true);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            // El usuario está autenticado en Firebase
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = { id: user.uid, ...userDoc.data() } as User;
                localStorage.setItem(AUTH_USER_LOCALSTORAGE_KEY, JSON.stringify(userData));
                setCurrentUser(userData);
            } else {
                // Caso raro: autenticado pero sin documento.
                await signOut(auth);
                localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
                setCurrentUser(null);
                router.push('/login');
            }
        } else {
            // Usuario no ha iniciado sesión
            setCurrentUser(null);
            localStorage.removeItem(AUTH_USER_LOCALSTORAGE_KEY);
            router.push('/login');
        }
        setIsLoading(false);
    });
    
    // El listener de serviceRecords para notificaciones de firma
    const q = query(
      collection(db, "serviceRecords"),
      where("status", "in", ["Entregado", "En Taller"])
    );

    const unsubscribeServices = onSnapshot(q, (snapshot) => {
      const unreadServices = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as ServiceRecord))
        .filter(
          (s) =>
            (s.customerSignatureReception && !s.receptionSignatureViewed) ||
            (s.customerSignatureDelivery && !s.deliverySignatureViewed)
        );
      setNewSignatureServices(unreadServices);
    });

    return () => {
        unsubscribeAuth();
        unsubscribeServices();
    };
  }, [router]);
  
  const handleNotificationsViewed = async () => {
    if (newSignatureServices.length === 0 || !db) return;

    const batch = writeBatch(db);
    newSignatureServices.forEach((service) => {
      const serviceRef = doc(db, "serviceRecords", service.id);
      const updateData: { receptionSignatureViewed?: boolean; deliverySignatureViewed?: boolean } = {};
      if (service.customerSignatureReception && !service.receptionSignatureViewed) {
        updateData.receptionSignatureViewed = true;
      }
      if (service.customerSignatureDelivery && !service.deliverySignatureViewed) {
        updateData.deliverySignatureViewed = true;
      }
      batch.update(serviceRef, updateData);
    });
    
    await batch.commit();
  };
  
  const handleLogout = async () => {
      if (!auth) return;
      await signOut(auth);
      // onAuthStateChanged se encargará de la redirección
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
            className="h-auto dark:invert"
            style={{width: '200px'}}
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
        newSignatureServices={newSignatureServices}
        onNotificationsViewed={handleNotificationsViewed}
        onLogout={handleLogout}
      />
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
