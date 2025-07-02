
"use client";

import Link from 'next/link';
import Image from "next/legacy/image";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, UserCircle, Car, Settings, LifeBuoy, LogOut, Wrench, Users, BarChart2, FileText, ShoppingCart, Truck, Tags, DollarSign, UserPlus, ShieldAlert } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMobile } from '@/hooks/use-mobile';
import { useNavigation } from '@/hooks/use-navigation';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient.js';
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { User as RanoroUser } from '@/types';
import { doc, getDoc } from 'firebase/firestore';


export function AppHeader() {
  const pathname = usePathname();
  const isMobile = useMobile();
  const { navigation, adminNavigation } = useNavigation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ranoroUser, setRanoroUser] = useState<RanoroUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        if (db) {
          const ranoroUserDoc = await getDoc(doc(db, 'users', user.uid));
          if (ranoroUserDoc.exists()) {
            setRanoroUser(ranoroUserDoc.data() as RanoroUser);
          }
        }
      } else {
        setCurrentUser(null);
        setRanoroUser(null);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  const mainNavItems = navigation.map(item => (
    <Button
      key={item.href}
      variant={pathname === item.href ? 'secondary' : 'ghost'}
      asChild
      size="sm"
    >
      <Link href={item.href} onClick={() => isMobile && setIsSheetOpen(false)}>
        <item.icon className="mr-2 h-4 w-4" />
        {item.label}
      </Link>
    </Button>
  ));

  const adminNavItems = adminNavigation.map(item => (
     <Button
        key={item.href}
        variant={pathname === item.href ? 'secondary' : 'ghost'}
        asChild
        size="sm"
      >
        <Link href={item.href} onClick={() => isMobile && setIsSheetOpen(false)}>
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Link>
      </Button>
  ));

  const navContent = (
    <>
      <nav className="flex flex-col gap-2 p-4">
        <p className="text-sm font-semibold text-muted-foreground px-2">Menú Principal</p>
        {mainNavItems}
        <Separator className="my-2" />
        <p className="text-sm font-semibold text-muted-foreground px-2">Administración</p>
        {adminNavItems}
      </nav>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 items-center">
        {isMobile ? (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <div className="flex items-center justify-center border-b p-4">
                <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsSheetOpen(false)}>
                  <Image
                    src="/ranoro-logo.png"
                    alt="Ranoro Logo"
                    width={120}
                    height={40}
                    className="dark:invert h-auto"
                  />
                </Link>
              </div>
              {navContent}
            </SheetContent>
          </Sheet>
        ) : (
          <div className="mr-4 hidden md:flex">
            <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
              <Image
                src="/ranoro-logo.png"
                alt="Ranoro Logo"
                width={100}
                height={35}
                className="dark:invert h-auto"
              />
            </Link>
            <nav className="flex items-center space-x-1">
              {mainNavItems}
            </nav>
          </div>
        )}
        <div className="flex flex-1 items-center justify-end space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar>
                    <AvatarImage src={ranoroUser?.photoURL || undefined} alt={ranoroUser?.name || 'Usuario'}/>
                    <AvatarFallback>{ranoroUser?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{ranoroUser?.name || 'Usuario'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/perfil"><UserCircle className="mr-2 h-4 w-4" /> Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                     <Link href="/admin/configuracion-ticket"><Settings className="mr-2 h-4 w-4" /> Configuración</Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                     <Link href="/manual"><LifeBuoy className="mr-2 h-4 w-4" /> Manual de Uso</Link>
                  </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={handleLogout}>
                   <LogOut className="mr-2 h-4 w-4" />
                   Cerrar Sesión
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
