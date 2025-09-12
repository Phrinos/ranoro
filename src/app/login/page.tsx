
// src/app/login/page.tsx
import Image from "next/image";
import Link from "next/link";
import { UserAuthForm } from "./components/user-auth-form";
import RanoroLogo from "@/components/ranoro-logo";

export default function LoginPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[380px] gap-6 p-4 sm:p-0">
            <div className="grid gap-2 text-center">
                <div className="mx-auto mb-4">
                    <RanoroLogo />
                </div>
                <h1 className="text-3xl font-bold">Inicia Sesión en tu Taller</h1>
                <p className="text-balance text-muted-foreground">
                    Ingresa tu correo electrónico para acceder a tu cuenta
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
      <div className="hidden bg-muted lg:block">
        <Image
          src="/login.png"
          alt="Taller mecánico Ranoro"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          priority
        />
      </div>
    </div>
  );
}
