

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
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { ServiceRecord, User, Vehicle, Technician, InventoryItem, Driver } from "@/types";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { cn } from "@/lib/utils";
import { RegisterPaymentDialog } from './rentas/components/register-payment-dialog';
import { useToast } from "@/hooks/use-toast";
import { operationsService, personnelService, inventoryService } from '@/lib/services';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

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

    const unsubDrivers = personnelService.onDriversUpdate(setDrivers);
    const unsubVehicles = inventoryService.onVehiclesUpdate(setVehicles);
    
    return () => {
        unsubscribeAuth();
        unsubDrivers();
        unsubVehicles();
    };
  }, [router]);
  
   useEffect(() => {
    if (searchParams.get('action') === 'registrar' && pathname === '/rentas') {
      setIsPaymentDialogOpen(true);
      // Clean up URL params after opening dialog
      const newUrl = window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const handleLogout = async () => {
      if (!auth) return;
      await signOut(auth);
  };
  
  const handleSavePayment = useCallback(async (driverId: string, amount: number, note: string | undefined, mileage?: number) => {
    try {
        await operationsService.addRentalPayment(driverId, amount, note, mileage);
        toast({ title: 'Pago Registrado' });
        setIsPaymentDialogOpen(false);
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }, [toast]);

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
      
      <RegisterPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        drivers={drivers}
        vehicles={vehicles}
        onSave={handleSavePayment}
      />
    </SidebarProvider>
  );
}
