// src/app/login/page.tsx
"use client";

import Image from "next/image";
import Link from 'next/link';
import { UserAuthForm } from "./components/user-auth-form";

export default function LoginPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <Link href="/" className="mb-4 inline-block relative w-[180px] h-[45px] mx-auto">
              <Image
                  src="/ranoro-logo.png"
                  alt="Ranoro Logo"
                  fill
                  style={{objectFit: 'contain'}}
                  sizes="180px"
                  priority
                  data-ai-hint="ranoro logo"
              />
            </Link>
            <p className="text-balance text-muted-foreground -mt-4">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>
          <UserAuthForm />
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link href="#" className="underline">
              Regístrate
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src="/login.png"
          alt="Image"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          sizes="50vw"
        />
         <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent"></div>
      </div>
    </div>
  );
}
