"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AccesoDenegadoPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/login");
    }, 3500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md border-none shadow-xl border border-red-100 bg-red-50/50">
        <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
                <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-700">Acceso Denegado</CardTitle>
            <CardDescription className="text-red-600/80 mt-2 text-md">
                Tu cuenta de Google no se encuentra registrada en nuestro directorio de personal. Si eres empleado, solicita alta al Administrador.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-6 space-y-4">
            <div className="flex items-center space-x-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirigiendo al inicio de sesión...</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
