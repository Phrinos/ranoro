# Guía para Replicar la Estructura de Autenticación y Rutas

Esta guía explica cómo replicar el sistema de autenticación y la separación entre páginas públicas y privadas que utilizamos en este proyecto de Next.js con Firebase.

## Resumen de la Estructura

La aplicación se divide en tres áreas principales:

1.  **Páginas Públicas (`src/app/(public)/`):** Contiene la landing page, páginas legales, etc. Son accesibles para todos.
2.  **Páginas Privadas/Administrador (`src/app/(app)/`):** Contiene el dashboard y todas las herramientas de gestión. Requiere que el usuario haya iniciado sesión.
3.  **Página de Login (`src/app/login/`):** Una página dedicada para que los usuarios inicien sesión.

Esta separación se logra usando **Route Groups** de Next.js (las carpetas con paréntesis como `(public)` y `(app)`) y un sistema de protección de rutas del lado del cliente.

---

## Paso 1: Estructura de Carpetas

En la raíz de tu carpeta `src/app/`, crea la siguiente estructura:

```
src/app/
├── (app)/                # Rutas protegidas/privadas
│   ├── dashboard/
│   ├── servicios/
│   │   └── page.tsx
│   ├── AppClientLayout.tsx # El componente CLAVE de protección
│   └── layout.tsx          # El layout que usa AppClientLayout
│
├── (public)/             # Rutas públicas
│   ├── page.tsx          # Tu landing page (ruta '/')
│   ├── layout.tsx          # El layout para las páginas públicas
│   └── ...otras carpetas
│
├── login/                # Página de inicio de sesión
│   └── page.tsx
│
└── layout.tsx              # El layout raíz de toda la aplicación
```

- **`(app)` y `(public)`:** Los paréntesis indican que estas carpetas no afectan la URL. `(app)/dashboard/page.tsx` será accesible en `/dashboard`.
- **`layout.tsx` dentro de cada grupo:** Cada grupo tiene su propio layout para definir la interfaz común de esa sección (ej. el sidebar en `(app)` o el header público en `(public)`).

---

## Paso 2: El Layout de la Zona Privada (`src/app/(app)/layout.tsx`)

Este layout es un **Componente de Servidor** simple. Su única misión es envolver el contenido en nuestro componente cliente que manejará la lógica de autenticación.

```tsx
// src/app/(app)/layout.tsx
import React, { Suspense } from 'react';
import AppClientLayout from './AppClientLayout';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AppClientLayout>{children}</AppClientLayout>
    </Suspense>
  );
}
```

---

## Paso 3: El Protector de Rutas (`src/app/(app)/AppClientLayout.tsx`)

Este es el componente más importante. Es un **Componente de Cliente** (`"use client"`) que verifica el estado de autenticación del usuario.

```tsx
// src/app/(app)/AppClientLayout.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth"; // Crearemos este hook en el siguiente paso
import { Loader2 } from "lucide-react";
// Importa aquí tus componentes de layout (Sidebar, Header, etc.)

function AppClientLayoutInner({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    // Si la carga ha terminado y no hay un usuario autenticado...
    if (!isLoading && !currentUser) {
      // Guarda la ruta que el usuario intentaba visitar.
      const next = `${pathname}${search?.toString() ? `?${search.toString()}` : ""}`;
      // Redirige a la página de login, pasando la ruta guardada como un parámetro 'next'.
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, currentUser, router, pathname, search]);

  // Mientras se verifica la sesión, muestra un indicador de carga.
  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-lg">Verificando sesión...</span>
      </div>
    );
  }

  // Si el usuario está autenticado, renderiza el layout principal de la app.
  return (
    <div>
      {/* <AppSidebar currentUser={currentUser} /> */}
      <main>
        {children}
      </main>
    </div>
  );
}

// Es buena práctica envolverlo en Suspense si usas hooks como useSearchParams
export default function AppClientLayout({ children }: { children: React.ReactNode }) {
    return <Suspense>{children}</Suspense>
}
```

---

## Paso 4: El Hook de Autenticación (`src/hooks/useAuth.ts`)

Este hook centraliza la lógica para escuchar el estado de autenticación de Firebase y gestionar los datos del usuario.

```ts
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type Auth, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient'; // Tu archivo de configuración de Firebase

// Define la estructura de tu usuario en Firestore
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  // ...otros campos
}

const AUTH_USER_KEY = 'authUser';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Intenta cargar desde localStorage para una carga inicial más rápida
    const cachedUser = localStorage.getItem(AUTH_USER_KEY);
    if (cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
    }

    if (!auth) {
        setIsLoading(false);
        return;
    }

    // El listener de Firebase Auth es la fuente de verdad final
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Si hay usuario en Firebase, escucha su documento en Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = { id: docSnap.id, ...docSnap.data() } as AppUser;
            setCurrentUser(userData);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
          } else {
            // Caso raro: autenticado pero sin documento en DB. Cierra sesión.
            signOut(auth);
          }
          setIsLoading(false);
        });
        return () => unsubDoc(); // Limpia la suscripción al documento
      } else {
        // No hay usuario, limpia el estado y localStorage
        setCurrentUser(null);
        localStorage.removeItem(AUTH_USER_KEY);
        setIsLoading(false);
      }
    });

    return () => unsubscribe(); // Limpia la suscripción de auth
  }, []);

  return { currentUser, isLoading };
}
```

---

## Paso 5: La Página de Login (`src/app/login/page.tsx`)

Finalmente, tu página de login se encargará de autenticar al usuario y redirigirlo.

```tsx
// src/app/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient"; // Tu config de Firebase

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!auth) throw new Error("Firebase Auth no inicializado");
      await signInWithEmailAndPassword(auth, email, password);

      // Redirige al usuario a la página que intentaba visitar,
      // o al dashboard si no había ninguna.
      const nextUrl = searchParams.get("next") || "/dashboard";
      router.push(nextUrl);
    } catch (error) {
      console.error("Error de login:", error);
      // Aquí mostrarías un toast o mensaje de error
      alert("Credenciales incorrectas.");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Iniciar Sesión</h1>
      <form onSubmit={handleLogin}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
    return <Suspense><LoginPageContent /></Suspense>
}
```

Con estos 5 pasos, tendrás un sistema robusto y moderno para gestionar el acceso a las diferentes secciones de tu aplicación.