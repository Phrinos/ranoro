
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OldFlotillaPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la nueva versión 2.0
    router.replace('/flotillav2');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirigiendo a Flotilla 2.0...</p>
      </div>
    </div>
  );
}
