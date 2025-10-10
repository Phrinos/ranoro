
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { AuditLog } from "@/types";
import { AdministracionTabs } from "./components/administracion-tabs";

type PageProps = { searchParams?: { tab?: string } };


export default async function AdministracionPage({ searchParams }: PageProps) {
  const defaultTab = searchParams?.tab === "migracion" ? "migracion" : "auditoria";

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Administración del Sistema</h1>
        <p className="text-primary-foreground/80 mt-1">
          Gestiona usuarios, roles y realiza migraciones de datos.
        </p>
      </div>

      {/* Boundary requerido si cualquier hijo usa useSearchParams */}
      <Suspense
        fallback={
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <AdministracionTabs initialLogs={[]} defaultTab={defaultTab} />
      </Suspense>
    </>
  );
}
