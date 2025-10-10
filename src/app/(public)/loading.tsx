
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4 text-xl text-muted-foreground">Cargando...</span>
      </div>
    </div>
  );
}
